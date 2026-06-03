'use strict';

const express = require('express');
const { execFile } = require('child_process');
const router = express.Router();

// ── Constants ──────────────────────────────────────────────
const GIT_TIMEOUT_MS = 30000; // 30 second timeout for git operations
const NPM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout for npm operations
const REPO_CWD = process.cwd();
const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/**
 * Execute a git command with timeout and error handling.
 *
 * @param {string[]} args - Git command arguments
 * @returns {Promise<{stdout: string, stderr: string}>}
 * @throws {Error} If git command times out or fails
 */
function runGit(args) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: REPO_CWD, timeout: GIT_TIMEOUT_MS }, (err, stdout = '', stderr = '') => {
      if (err) {
        const error = new Error((stderr || err.message || 'Git command failed').trim());
        error.stdout = stdout;
        error.stderr = stderr;
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
}

function runNpm(args) {
  return new Promise((resolve, reject) => {
    execFile(NPM_BIN, args, { cwd: REPO_CWD, timeout: NPM_TIMEOUT_MS }, (err, stdout = '', stderr = '') => {
      if (err) {
        const error = new Error((stderr || stdout || err.message || 'npm command failed').trim());
        error.stdout = stdout;
        error.stderr = stderr;
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
}

async function ensureRepo() {
  const { stdout } = await runGit(['rev-parse', '--is-inside-work-tree']);
  if (!stdout.trim()) throw new Error('Not a git repository');
}

function parseStatus(raw) {
  const lines = raw.trim().split('\n').filter(Boolean);
  const branchLine = lines.shift() || '';
  let branch = 'unknown';
  let upstream = null;
  let ahead = 0;
  let behind = 0;

  const match = branchLine.match(/^## (?:(.+?))(?:\.{3}(.+?))?(?: \[(.+)\])?$/);
  if (!match) {
    // Git status format changed or unparseable - return safe defaults
    console.error('[git] Failed to parse git status branch line:', branchLine);
  } else {
    branch = match[1];
    upstream = match[2] || null;
    if (match[3]) {
      const nums = match[3].split(',').map((s) => s.trim());
      nums.forEach((item) => {
        const [dir, count] = item.split(' ');
        if (dir === 'ahead') ahead = parseInt(count, 10) || 0;
        if (dir === 'behind') behind = parseInt(count, 10) || 0;
      });
    }
  }

  const files = lines.map((line) => {
    const status = line.slice(0, 2).trim();
    const file = line.slice(3).trim();
    return { status: status || '?', file };
  });

  return { branch, upstream, ahead, behind, files, dirty: files.length > 0 };
}

function parseLog(raw) {
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|');
      const hash = parts.shift();
      const author = parts.pop();
      const rel = parts.pop();
      const message = parts.join('|');
      return { hash, message, rel, author };
    });
}

async function getUpstreamRef() {
  try {
    const { stdout } = await runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function hasUncommittedChanges() {
  const { stdout } = await runGit(['status', '--porcelain']);
  return Boolean(stdout.trim());
}

function appendStepOutput(steps, output) {
  const trimmed = String(output || '').trim();
  if (trimmed) steps.push(trimmed);
}

router.get('/status', async (req, res) => {
  try {
    await ensureRepo();
    const { stdout } = await runGit(['status', '--porcelain=v1', '-b']);
    const parsed = parseStatus(stdout);
    const upstream = parsed.upstream || (await getUpstreamRef());
    return res.json({ ...parsed, upstream, statusRaw: stdout });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/log', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10) || 20, 50);
  try {
    await ensureRepo();
    const { stdout } = await runGit([
      'log',
      `-n`,
      `${limit}`,
      '--pretty=format:%h|%s|%cr|%an',
    ]);
    return res.json({ commits: parseLog(stdout) });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/commit', async (req, res) => {
  const message = (req.body && req.body.message) ? String(req.body.message).trim() : '';
  if (!message) {
    return res.status(400).json({ error: 'Commit message is required' });
  }
  try {
    await ensureRepo();
    await runGit(['add', '-A']);
    const { stdout } = await runGit(['commit', '-m', message]);
    return res.json({ success: true, output: stdout.trim() });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/fetch', async (req, res) => {
  try {
    await ensureRepo();
    const { stdout } = await runGit(['fetch']);
    return res.json({ success: true, output: stdout.trim() });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/pull', async (req, res) => {
  try {
    await ensureRepo();
    const upstream = await getUpstreamRef();
    if (!upstream) {
      return res.status(400).json({ error: 'No upstream branch set. Set upstream before pulling.' });
    }
    const { stdout } = await runGit(['pull', '--ff-only']);
    return res.json({ success: true, output: stdout.trim() });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/push', async (req, res) => {
  try {
    await ensureRepo();
    const upstream = await getUpstreamRef();
    const args = ['push'];
    if (!upstream) args.push('-u', 'origin', 'HEAD');
    const { stdout } = await runGit(args);
    return res.json({ success: true, output: stdout.trim(), upstream: upstream || 'origin/HEAD' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/update', async (req, res) => {
  try {
    await ensureRepo();

    if (await hasUncommittedChanges()) {
      return res.status(400).json({
        error: 'Working tree has uncommitted changes. Commit or stash before running updater.',
      });
    }

    const upstream = await getUpstreamRef();
    if (!upstream) {
      return res.status(400).json({ error: 'No upstream branch set. Set upstream before updating.' });
    }

    const steps = [];
    const { stdout: fetchOut } = await runGit(['fetch']);
    appendStepOutput(steps, fetchOut);

    const { stdout: pullOut } = await runGit(['pull', '--ff-only']);
    appendStepOutput(steps, pullOut);

    const { stdout: installOut } = await runNpm(['ci', '--no-audit', '--no-fund']);
    appendStepOutput(steps, installOut);

    const { stdout: buildOut } = await runNpm(['run', 'build', '--if-present']);
    appendStepOutput(steps, buildOut);

    return res.json({
      success: true,
      summary: 'Updater finished: pulled latest changes, installed dependencies, and rebuilt assets.',
      output: steps.join('\n\n'),
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/cleanup-merged', async (req, res) => {
  try {
    await ensureRepo();
    const { stdout: currentBranchOut } = await runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    const currentBranch = currentBranchOut.trim();

    const { stdout: mergedOut } = await runGit(['branch', '--merged']);
    const mergedBranches = mergedOut
      .split('\n')
      .map((line) => line.replace(/^\*\s*/, '').trim())
      .filter(Boolean)
      .filter((name) => !['HEAD', currentBranch, 'main', 'master', 'develop'].includes(name));

    const deleted = [];
    const skipped = [];

    for (const branch of mergedBranches) {
      try {
        await runGit(['branch', '-d', branch]);
        deleted.push(branch);
      } catch (err) {
        skipped.push({ branch, error: err.message.trim() });
      }
    }

    return res.json({
      success: true,
      deleted,
      skipped,
      currentBranch,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
