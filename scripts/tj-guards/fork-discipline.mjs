#!/usr/bin/env node
// fork 隔离守卫 —— 主 checkout 上非 merge 直提交 tj/desktop 一律拦截（lefthook pre-commit 首条 job）。
//
// 依据（真源 = 天鉴仓 AGENTS.md「fork 隔离机制」 / docs/agents/handoff-web-fork.md）：
//   - 天鉴壳唯一集成分支 tj/desktop 只在主 checkout（D:\project\DSH\deepseek-harness）上
//     承担官方发版 merge、家族 bump、打包发布等运营操作；
//   - 任何壳层文件编辑必须先在 tj/wip-* worktree 里进行，干完合回 tj/desktop 即删；
//   - 本守卫拦截"主 checkout 直接 commit 到 tj/desktop"这类共同编辑冲突（2026-10-25 事故）。
//
// 放行路径（满足其一即通过）：
//   a. 不在主 checkout（linked worktree，即 tj/wip-* 工作区）；
//   b. 非 tj/desktop 分支；
//   c. merge 提交（存在 MERGE_HEAD，官方发版 merge / wip 合回等）；
//   d. TJ_ALLOW_DIRECT_TJ_COMMIT=1（仅 release/bump/跟上游等脚本化运营操作）。
import { execFileSync } from "node:child_process";

function git(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const absGitDir = git(["rev-parse", "--absolute-git-dir"]);
const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
const inMainCheckout = absGitDir !== "" && !absGitDir.includes("/worktrees/");
const isMerge = git(["rev-parse", "-q", "--verify", "MERGE_HEAD"]) !== "";
const allowOps = process.env.TJ_ALLOW_DIRECT_TJ_COMMIT === "1";

if (inMainCheckout && branch === "tj/desktop" && !isMerge && !allowOps) {
  console.error(
    [
      "✋ fork 隔离守卫：主 checkout 不允许直改 tj/desktop（非 merge 提交）。",
      "  壳层改动请走 wip worktree：",
      "    git worktree add -b tj/wip-<名> D:/project/DSH/tmp/fork-wt-<名>   # 从 tj/desktop 切出",
      "    干完合回 tj/desktop（git merge）后：git worktree remove 即删。",
      "  仅 release/bump/跟上游等运营操作可放行：",
      "    TJ_ALLOW_DIRECT_TJ_COMMIT=1 git commit ...   # Git Bash",
      "    set TJ_ALLOW_DIRECT_TJ_COMMIT=1 && git commit ...   # cmd",
      "  详见天鉴仓 AGENTS.md「fork 隔离机制」/ docs/agents/handoff-web-fork.md。",
    ].join("\n")
  );
  process.exit(1);
}

process.exit(0);
