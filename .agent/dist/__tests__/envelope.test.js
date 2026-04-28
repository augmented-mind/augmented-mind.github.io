"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const envelope_js_1 = require("../envelope.js");
const repoRoot = node_path_1.default.resolve(__dirname, "../../..");
function readRepoFile(relativePath) {
    return (0, node_fs_1.readFileSync)(node_path_1.default.join(repoRoot, relativePath), "utf8");
}
const VALID_PARAMS = {
    repo_slug: "self-evolving/repo",
    route: "review",
    source_kind: "issue_comment",
    target_kind: "pull_request",
    target_number: 42,
    target_url: "https://github.com/self-evolving/repo/pull/42",
    request_text: "please review this",
    requested_by: "lolipopshock",
};
(0, node_test_1.test)("shared base prompt exists and contains the metadata contract", () => {
    const base = readRepoFile(".github/prompts/_base.md");
    node_assert_1.strict.match(base, /Target: \$\{TARGET_KIND\} #\$\{TARGET_NUMBER\}/);
    node_assert_1.strict.match(base, /Source: \$\{SOURCE_KIND\}/);
    node_assert_1.strict.match(base, /URL: \$\{TARGET_URL\}/);
    node_assert_1.strict.match(base, /\$\{REPO_SLUG\}/);
    node_assert_1.strict.match(base, /\$\{REQUESTED_BY\}/);
    node_assert_1.strict.match(base, /\$\{REQUEST_TEXT\}/);
    node_assert_1.strict.match(base, /gh issue view/);
    node_assert_1.strict.match(base, /gh pr view/);
});
(0, node_test_1.test)("route prompts do not duplicate the base metadata header", () => {
    const reviewPrompt = readRepoFile(".github/prompts/review.md");
    const implementPrompt = readRepoFile(".github/prompts/agent-implement.md");
    node_assert_1.strict.doesNotMatch(reviewPrompt, /Target: \$\{TARGET_KIND\} #\$\{TARGET_NUMBER\}/);
    node_assert_1.strict.doesNotMatch(implementPrompt, /Target: \$\{TARGET_KIND\} #\$\{TARGET_NUMBER\}/);
    node_assert_1.strict.doesNotMatch(reviewPrompt, /Source: \$\{SOURCE_KIND\}/);
    node_assert_1.strict.doesNotMatch(implementPrompt, /Source: \$\{SOURCE_KIND\}/);
});
(0, node_test_1.test)("review and implement prompts use self-serve context gathering", () => {
    const reviewPrompt = readRepoFile(".github/prompts/review.md");
    const implementPrompt = readRepoFile(".github/prompts/agent-implement.md");
    node_assert_1.strict.match(reviewPrompt, /gh pr view \$\{TARGET_NUMBER\} --repo \$\{REPO_SLUG\}/);
    node_assert_1.strict.match(reviewPrompt, /gh pr diff \$\{TARGET_NUMBER\} --repo \$\{REPO_SLUG\}/);
    node_assert_1.strict.doesNotMatch(reviewPrompt, /\$\{PR_META_FILE\}|\$\{DIFF_FILE\}|\$\{RESOURCE_MANIFEST_FILE\}/);
    node_assert_1.strict.match(implementPrompt, /gh issue view \$\{TARGET_NUMBER\} --repo \$\{REPO_SLUG\}/);
    node_assert_1.strict.match(implementPrompt, /"commit_message"/);
    node_assert_1.strict.match(implementPrompt, /Closes #\$\{TARGET_NUMBER\}/);
    node_assert_1.strict.doesNotMatch(implementPrompt, /\$\{PRIMARY_CONTEXT_FILE\}|\$\{RESOURCE_MANIFEST_FILE\}/);
});
(0, node_test_1.test)("issue enhancement prompt uses self-serve context gathering", () => {
    const issueEnhancePrompt = readRepoFile(".github/prompts/agent-issue-enhance.md");
    node_assert_1.strict.match(issueEnhancePrompt, /gh issue view \$\{TARGET_NUMBER\} --repo \$\{REPO_SLUG\}/);
    node_assert_1.strict.doesNotMatch(issueEnhancePrompt, /\$\{PRIMARY_CONTEXT_FILE\}|\$\{RESOURCE_MANIFEST_FILE\}/);
});
(0, node_test_1.test)("answer prompt returns content for workflow posting instead of commenting directly", () => {
    const answerPrompt = readRepoFile(".github/prompts/agent-answer.md");
    node_assert_1.strict.match(answerPrompt, /do not post comments directly via `gh`/i);
    node_assert_1.strict.match(answerPrompt, /workflow will post it on the original surface/i);
});
(0, node_test_1.test)("fix-pr prompt uses self-serve context, not local snapshots", () => {
    const fixPrompt = readRepoFile(".github/prompts/agent-fix-pr.md");
    node_assert_1.strict.doesNotMatch(fixPrompt, /\$\{PR_META_FILE\}/);
    node_assert_1.strict.doesNotMatch(fixPrompt, /\$\{PR_DIFF_FILE\}/);
    node_assert_1.strict.doesNotMatch(fixPrompt, /\$\{REVIEW_COMMENTS_FILE\}/);
    node_assert_1.strict.doesNotMatch(fixPrompt, /\$\{REQUEST_COMMENT_FILE\}/);
    node_assert_1.strict.doesNotMatch(fixPrompt, /\$\{RESOURCE_MANIFEST_FILE\}/);
    node_assert_1.strict.match(fixPrompt, /gh pr view \$\{TARGET_NUMBER\}/);
    node_assert_1.strict.match(fixPrompt, /\$\{REQUEST_COMMENT_ID\}/);
    node_assert_1.strict.match(fixPrompt, /"commit_message"/);
});
(0, node_test_1.test)("agent-review and agent-implement workflows do not build linked context", () => {
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    const implementWorkflow = readRepoFile(".github/workflows/agent-implement.yml");
    node_assert_1.strict.doesNotMatch(reviewWorkflow, /build-linked-context\.cjs/);
    node_assert_1.strict.doesNotMatch(implementWorkflow, /build-linked-context\.cjs/);
});
(0, node_test_1.test)("all execution workflows use the shared run-agent-task action", () => {
    const implementWorkflow = readRepoFile(".github/workflows/agent-implement.yml");
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    const fixPrWorkflow = readRepoFile(".github/workflows/agent-fix-pr.yml");
    for (const workflow of [implementWorkflow, reviewWorkflow, fixPrWorkflow]) {
        node_assert_1.strict.match(workflow, /uses: \.\/\.github\/actions\/run-agent-task/);
        node_assert_1.strict.doesNotMatch(workflow, /\.github\/scripts\/lib\/agent\/run-codex\.sh/);
    }
    node_assert_1.strict.doesNotMatch(fixPrWorkflow, /build-linked-context\.cjs/);
});
(0, node_test_1.test)("single-agent workflows resolve provider before runtime setup", () => {
    const routerWorkflow = readRepoFile(".github/workflows/agent-router.yml");
    const implementWorkflow = readRepoFile(".github/workflows/agent-implement.yml");
    const fixPrWorkflow = readRepoFile(".github/workflows/agent-fix-pr.yml");
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    const autonomousWorkflows = [
        readRepoFile(".github/workflows/agent-daily-summary.yml"),
        readRepoFile(".github/workflows/agent-memory-bootstrap.yml"),
        readRepoFile(".github/workflows/agent-memory-pr-closed.yml"),
        readRepoFile(".github/workflows/agent-memory-scan.yml"),
        readRepoFile(".github/workflows/agent-rubrics-initialization.yml"),
        readRepoFile(".github/workflows/agent-rubrics-review.yml"),
        readRepoFile(".github/workflows/agent-rubrics-update.yml"),
    ];
    const resolverAction = readRepoFile(".github/actions/resolve-agent-provider/action.yml");
    const resolverScript = readRepoFile(".github/actions/resolve-agent-provider/resolve-provider.sh");
    const configurationList = readRepoFile(".agent/docs/customization/configuration-list.md");
    node_assert_1.strict.match(resolverAction, /resolve-provider\.sh/);
    node_assert_1.strict.match(resolverScript, /DEFAULT_PROVIDER/);
    node_assert_1.strict.match(resolverScript, /OPENAI_API_KEY/);
    node_assert_1.strict.match(resolverScript, /CLAUDE_CODE_OAUTH_TOKEN/);
    node_assert_1.strict.match(resolverScript, /provider=codex/);
    node_assert_1.strict.match(resolverScript, /provider=claude/);
    node_assert_1.strict.match(routerWorkflow, /default:\s*auto/);
    node_assert_1.strict.doesNotMatch(routerWorkflow, /vars\.AGENT_PROVIDER_(DISPATCH|ANSWER|SKILL)/);
    node_assert_1.strict.match(routerWorkflow, /required:\s*"false"/);
    node_assert_1.strict.match(routerWorkflow, /id:\s*dispatch_provider/);
    node_assert_1.strict.match(routerWorkflow, /id:\s*skill_provider/);
    node_assert_1.strict.match(routerWorkflow, /agent:\s*\$\{\{\s*steps\.dispatch_provider\.outputs\.provider\s*\}\}/);
    node_assert_1.strict.match(routerWorkflow, /agent:\s*\$\{\{\s*steps\.skill_provider\.outputs\.provider\s*\}\}/);
    node_assert_1.strict.match(routerWorkflow, /agent:\s*\$\{\{\s*steps\.provider\.outputs\.provider\s*\}\}/);
    for (const workflow of [implementWorkflow, fixPrWorkflow, ...autonomousWorkflows]) {
        node_assert_1.strict.match(workflow, /uses: \.\/\.github\/actions\/resolve-agent-provider/);
        node_assert_1.strict.match(workflow, /default_provider:\s*\$\{\{\s*vars\.AGENT_DEFAULT_PROVIDER \|\|/);
        node_assert_1.strict.match(workflow, /install_codex:\s*\$\{\{\s*steps\.provider\.outputs\.install_codex\s*\}\}/);
        node_assert_1.strict.match(workflow, /install_claude:\s*\$\{\{\s*steps\.provider\.outputs\.install_claude\s*\}\}/);
        node_assert_1.strict.match(workflow, /agent:\s*\$\{\{\s*steps\.provider\.outputs\.provider\s*\}\}/);
        node_assert_1.strict.match(workflow, /claude_oauth_token:\s*\$\{\{\s*secrets\.CLAUDE_CODE_OAUTH_TOKEN\s*\}\}/);
    }
    node_assert_1.strict.match(fixPrWorkflow, /lane:\s*fix-pr-\$\{\{\s*steps\.provider\.outputs\.provider\s*\}\}/);
    node_assert_1.strict.match(reviewWorkflow, /name:\s*Resolve synthesis provider/);
    node_assert_1.strict.match(reviewWorkflow, /id:\s*synthesis_provider/);
    node_assert_1.strict.match(reviewWorkflow, /route:\s*review-synthesize/);
    node_assert_1.strict.match(reviewWorkflow, /default_provider:\s*\$\{\{\s*vars\.AGENT_DEFAULT_PROVIDER \|\| 'auto'\s*\}\}/);
    node_assert_1.strict.match(reviewWorkflow, /install_codex:\s*\$\{\{\s*steps\.synthesis_provider\.outputs\.install_codex\s*\}\}/);
    node_assert_1.strict.match(reviewWorkflow, /install_claude:\s*\$\{\{\s*steps\.synthesis_provider\.outputs\.install_claude\s*\}\}/);
    node_assert_1.strict.match(reviewWorkflow, /agent:\s*\$\{\{\s*steps\.synthesis_provider\.outputs\.provider\s*\}\}/);
    node_assert_1.strict.match(reviewWorkflow, /openai_api_key:\s*\$\{\{\s*secrets\.OPENAI_API_KEY\s*\}\}/);
    node_assert_1.strict.doesNotMatch(implementWorkflow, /vars\.AGENT_PROVIDER_IMPLEMENT/);
    node_assert_1.strict.doesNotMatch(fixPrWorkflow, /vars\.AGENT_PROVIDER_FIX_PR/);
    node_assert_1.strict.match(configurationList, /AGENT_DEFAULT_PROVIDER/);
    node_assert_1.strict.doesNotMatch(configurationList, /AGENT_PROVIDER_IMPLEMENT/);
});
(0, node_test_1.test)("scheduled workflows evaluate skip gates before provider-dependent jobs", () => {
    const dailySummaryWorkflow = readRepoFile(".github/workflows/agent-daily-summary.yml");
    const memoryScanWorkflow = readRepoFile(".github/workflows/agent-memory-scan.yml");
    const memorySyncWorkflow = readRepoFile(".github/workflows/agent-memory-sync.yml");
    const gateAction = readRepoFile(".github/actions/scheduled-activity-gate/action.yml");
    node_assert_1.strict.match(gateAction, /\.agent\/scripts\/resolve-scheduled-activity-gate\.sh/);
    node_assert_1.strict.doesNotMatch(gateAction, /resolve-gate\.js/);
    node_assert_1.strict.doesNotMatch(gateAction, /\.agent\/dist\/cli\/resolve-scheduled-activity-gate\.js/);
    node_assert_1.strict.match(memoryScanWorkflow, /gate:\n[\s\S]*Resolve scheduled activity gate/);
    node_assert_1.strict.match(memoryScanWorkflow, /scan:\n\s+needs: gate\n\s+if: needs\.gate\.outputs\.skip != 'true'/);
    node_assert_1.strict.match(memoryScanWorkflow, /Resolve memory scan provider[\s\S]*Setup agent runtime/);
    node_assert_1.strict.doesNotMatch(memoryScanWorkflow, /if: steps\.gate\.outputs\.skip != 'true'/);
    node_assert_1.strict.match(memorySyncWorkflow, /gate:\n[\s\S]*Resolve scheduled activity gate/);
    node_assert_1.strict.match(memorySyncWorkflow, /sync:\n\s+needs: gate\n\s+if: needs\.gate\.outputs\.skip != 'true'/);
    node_assert_1.strict.doesNotMatch(memorySyncWorkflow, /if: steps\.gate\.outputs\.skip != 'true'/);
    node_assert_1.strict.match(dailySummaryWorkflow, /pre_gate:\n[\s\S]*Resolve scheduled disabled gate/);
    node_assert_1.strict.match(dailySummaryWorkflow, /signals:\n\s+needs: pre_gate\n\s+if: needs\.pre_gate\.outputs\.skip != 'true'/);
    node_assert_1.strict.match(dailySummaryWorkflow, /daily-summary:\n\s+needs: signals\n\s+if: needs\.signals\.result == 'success' && needs\.signals\.outputs\.skip != 'true'/);
    node_assert_1.strict.match(dailySummaryWorkflow, /daily-summary-signals-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
    node_assert_1.strict.match(dailySummaryWorkflow, /Upload summary signals[\s\S]*actions\/upload-artifact@v4/);
    node_assert_1.strict.match(dailySummaryWorkflow, /Download summary signals[\s\S]*actions\/download-artifact@v4/);
    node_assert_1.strict.doesNotMatch(dailySummaryWorkflow, /COMMIT_COUNT/);
    node_assert_1.strict.match(dailySummaryWorkflow, /count=\$\(\(ISSUE_COUNT \+ PULL_COUNT \+ DISCUSSION_COUNT\)\)/);
    node_assert_1.strict.match(dailySummaryWorkflow, /Resolve daily summary provider[\s\S]*Setup selected provider/);
    node_assert_1.strict.doesNotMatch(dailySummaryWorkflow, /if: steps\.pre_gate\.outputs\.skip != 'true' && steps\.gate\.outputs\.skip != 'true'/);
});
(0, node_test_1.test)("review workflow forwards requested_by to review, rubrics, and synthesis runs", () => {
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    const forwardedValue = /requested_by:\s*\$\{\{\s*inputs\.requested_by \|\| github\.actor\s*\}\}/g;
    const matches = reviewWorkflow.match(forwardedValue) || [];
    node_assert_1.strict.equal(matches.length, 3);
});
(0, node_test_1.test)("review synthesis uses a shared reviews directory contract", () => {
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    const synthesisPrompt = readRepoFile(".github/prompts/review-synthesize.md");
    const runSource = readRepoFile(".agent/src/run.ts");
    node_assert_1.strict.match(reviewWorkflow, /review:\n\s+# Reviewer lanes are best-effort[\s\S]*?continue-on-error:\s*true/);
    node_assert_1.strict.match(reviewWorkflow, /synthesize:\n\s*needs:\s*\[review\]\n\s*if:\s*\$\{\{\s*!cancelled\(\)\s*\}\}/);
    node_assert_1.strict.match(reviewWorkflow, /find "\$reviews_dir" -type f -name review\.md/);
    node_assert_1.strict.match(reviewWorkflow, /REVIEWS_DIR:\s*\$\{\{\s*steps\.reviews\.outputs\.reviews_dir\s*\}\}/);
    node_assert_1.strict.match(synthesisPrompt, /\$\{REVIEWS_DIR\}/);
    node_assert_1.strict.match(runSource, /"REVIEWS_DIR"/);
    node_assert_1.strict.match(runSource, /"MEMORY_DIR"/);
    node_assert_1.strict.doesNotMatch(runSource, /PROMPT_VAR_MEMORY_/);
});
(0, node_test_1.test)("agent router bypasses dispatch triage for explicit mention slash routes", () => {
    const runnerWorkflow = readRepoFile(".github/workflows/agent-router.yml");
    const extractContext = readRepoFile(".agent/src/cli/extract-context.ts");
    const resolveDispatch = readRepoFile(".agent/src/cli/resolve-dispatch.ts");
    node_assert_1.strict.match(extractContext, /setOutput\("requested_route", requestedRoute\)/);
    node_assert_1.strict.match(runnerWorkflow, /steps\.context\.outputs\.should_respond == 'true'[\s\S]*steps\.context\.outputs\.requested_route == ''/);
    node_assert_1.strict.match(runnerWorkflow, /REQUESTED_ROUTE:\s*\$\{\{\s*steps\.context\.outputs\.requested_route\s*\}\}/);
    node_assert_1.strict.match(resolveDispatch, /buildRequestedRouteDecision/);
});
(0, node_test_1.test)("agent router supports label-triggered route and skill overrides", () => {
    const runnerWorkflow = readRepoFile(".github/workflows/agent-router.yml");
    const extractContext = readRepoFile(".agent/src/cli/extract-context.ts");
    const labelWorkflow = readRepoFile(".github/workflows/agent-label.yml");
    const entrypointWorkflow = readRepoFile(".github/workflows/agent-entrypoint.yml");
    const approveWorkflow = readRepoFile(".github/workflows/agent-approve.yml");
    node_assert_1.strict.match(runnerWorkflow, /trigger_kind:/);
    node_assert_1.strict.match(runnerWorkflow, /label_name:/);
    node_assert_1.strict.match(runnerWorkflow, /requested_skill:/);
    node_assert_1.strict.match(runnerWorkflow, /needs\.portal\.outputs\.route == 'skill'/);
    node_assert_1.strict.match(runnerWorkflow, /workflow_call:[\s\S]*outputs:[\s\S]*should_respond:/);
    node_assert_1.strict.doesNotMatch(runnerWorkflow, /clear-trigger-label:/);
    node_assert_1.strict.match(runnerWorkflow, /vars\.AGENT_RUNS_ON/);
    node_assert_1.strict.match(extractContext, /resolveRequestedLabel/);
    node_assert_1.strict.match(labelWorkflow, /issues:\s+types: \[labeled\]/);
    node_assert_1.strict.match(labelWorkflow, /pull_request_target:\s+types: \[labeled\]/);
    node_assert_1.strict.match(labelWorkflow, /cleanup-label:/);
    node_assert_1.strict.match(labelWorkflow, /needs\.agent\.result == 'success'/);
    node_assert_1.strict.match(labelWorkflow, /needs\.agent\.outputs\.should_respond == 'true'/);
    node_assert_1.strict.doesNotMatch(labelWorkflow, /author_association:\s*COLLABORATOR/);
    node_assert_1.strict.match(labelWorkflow, /\.\/\.github\/actions\/resolve-github-auth/);
    node_assert_1.strict.match(labelWorkflow, /fallback_token:\s*\$\{\{\s*github\.token\s*\}\}/);
    node_assert_1.strict.match(labelWorkflow, /actions\/github-script@v7/);
    node_assert_1.strict.match(labelWorkflow, /github-token:\s*\$\{\{\s*steps\.auth\.outputs\.token\s*\}\}/);
    node_assert_1.strict.match(labelWorkflow, /github\.rest\.issues\.removeLabel/);
    node_assert_1.strict.match(labelWorkflow, /vars\.AGENT_RUNS_ON/);
    node_assert_1.strict.match(entrypointWorkflow, /vars\.AGENT_RUNS_ON/);
    node_assert_1.strict.match(approveWorkflow, /vars\.AGENT_RUNS_ON/);
});
(0, node_test_1.test)("agent status label is opt-in and fixed to the AGENT_STATUS_LABEL_ENABLED variable", () => {
    const runnerWorkflow = readRepoFile(".github/workflows/agent-router.yml");
    const implementWorkflow = readRepoFile(".github/workflows/agent-implement.yml");
    const fixPrWorkflow = readRepoFile(".github/workflows/agent-fix-pr.yml");
    const createPrCli = readRepoFile(".agent/src/cli/create-pr.ts");
    const addLabelCli = readRepoFile(".agent/src/cli/add-label.ts");
    const configurationList = readRepoFile(".agent/docs/customization/configuration-list.md");
    const supportedWorkflows = readRepoFile(".agent/docs/architecture/supported-workflows.md");
    node_assert_1.strict.match(configurationList, /AGENT_STATUS_LABEL_ENABLED/);
    node_assert_1.strict.match(supportedWorkflows, /fixed `agent` status label/);
    node_assert_1.strict.match(addLabelCli, /const STATUS_LABEL = "agent"/);
    node_assert_1.strict.match(addLabelCli, /AGENT_STATUS_LABEL_ENABLED/);
    node_assert_1.strict.doesNotMatch(addLabelCli, /AGENT_STATUS_LABEL_NAME/);
    node_assert_1.strict.doesNotMatch(addLabelCli, /AGENT_STATUS_LABEL_COLOR/);
    node_assert_1.strict.doesNotMatch(addLabelCli, /AGENT_STATUS_LABEL_DESCRIPTION/);
    node_assert_1.strict.match(runnerWorkflow, /- name: Resolve route[\s\S]*- name: Label handled issue or PR[\s\S]*- name: React with thumbs up/);
    node_assert_1.strict.match(runnerWorkflow, /vars\.AGENT_STATUS_LABEL_ENABLED == 'true'/);
    node_assert_1.strict.match(runnerWorkflow, /steps\.dispatch\.outputs\.route != 'unsupported'/);
    node_assert_1.strict.match(runnerWorkflow, /\(steps\.context\.outputs\.target_kind == 'issue' \|\| steps\.context\.outputs\.target_kind == 'pull_request'\)/);
    node_assert_1.strict.doesNotMatch(runnerWorkflow, /status_label_name:/);
    node_assert_1.strict.doesNotMatch(runnerWorkflow, /AGENT_STATUS_LABEL_NAME/);
    node_assert_1.strict.doesNotMatch(runnerWorkflow, /AGENT_STATUS_LABEL_COLOR/);
    node_assert_1.strict.doesNotMatch(runnerWorkflow, /AGENT_STATUS_LABEL_DESCRIPTION/);
    node_assert_1.strict.match(implementWorkflow, /- name: Label source issue[\s\S]*TARGET_KIND: issue/);
    node_assert_1.strict.match(implementWorkflow, /- name: Label generated pull request[\s\S]*TARGET_KIND: pull_request[\s\S]*TARGET_NUMBER: \$\{\{ steps\.pr\.outputs\.pr_number \}\}/);
    node_assert_1.strict.match(fixPrWorkflow, /- name: Label target pull request[\s\S]*vars\.AGENT_STATUS_LABEL_ENABLED == 'true'[\s\S]*steps\.pr\.outputs\.cross_repo != 'true'[\s\S]*steps\.pr\.outputs\.pr_state == 'OPEN'[\s\S]*TARGET_KIND: pull_request/);
    node_assert_1.strict.match(createPrCli, /setOutput\("pr_number"/);
});
(0, node_test_1.test)("agent router posts unsupported route summaries directly instead of running the answer agent", () => {
    const runnerWorkflow = readRepoFile(".github/workflows/agent-router.yml");
    node_assert_1.strict.match(runnerWorkflow, /Prepare unsupported response/);
    node_assert_1.strict.match(runnerWorkflow, /needs\.portal\.outputs\.route == 'unsupported'/);
    node_assert_1.strict.match(runnerWorkflow, /- name: Setup agent runtime[\s\S]*needs\.portal\.outputs\.route == 'answer' \|\|[\s\S]*needs\.portal\.outputs\.route == 'unsupported'/);
    node_assert_1.strict.match(runnerWorkflow, /install_codex:\s*\$\{\{\s*needs\.portal\.outputs\.route == 'answer' && steps\.provider\.outputs\.install_codex \|\| 'false'\s*\}\}/);
    node_assert_1.strict.match(runnerWorkflow, /install_claude:\s*\$\{\{\s*needs\.portal\.outputs\.route == 'answer' && steps\.provider\.outputs\.install_claude \|\| 'false'\s*\}\}/);
    node_assert_1.strict.match(runnerWorkflow, /SUMMARY:\s*\$\{\{\s*needs\.portal\.outputs\.summary\s*\}\}/);
    node_assert_1.strict.match(runnerWorkflow, /Post unsupported response/);
    node_assert_1.strict.match(runnerWorkflow, /- name: Run answer agent[\s\S]*if:\s*needs\.portal\.outputs\.route == 'answer'/);
});
(0, node_test_1.test)("agent router dispatches agent-implement directly for explicit implement requests", () => {
    const runnerWorkflow = readRepoFile(".github/workflows/agent-router.yml");
    const approveWorkflow = readRepoFile(".github/workflows/agent-approve.yml");
    const implementJobMatch = runnerWorkflow.match(/\n  implement:\n[\s\S]*?(?=\n  [a-z][a-z0-9-]*:\n)/);
    node_assert_1.strict.ok(implementJobMatch, "implement job should exist in agent-router.yml");
    const implementJob = implementJobMatch[0];
    // Mutual exclusion with the approval job: runs only when the dispatch
    // decision said an implementation-like route and no approval gate is needed.
    node_assert_1.strict.match(implementJob, /needs\.portal\.outputs\.route == 'implement'/);
    node_assert_1.strict.match(implementJob, /needs\.portal\.outputs\.route == 'create-action'/);
    node_assert_1.strict.match(implementJob, /needs\.portal\.outputs\.needs_approval == 'false'/);
    // Runtime must be bootstrapped before any node .agent/dist/* calls.
    node_assert_1.strict.match(implementJob, /uses:\s*\.\/\.github\/actions\/setup-agent-runtime/);
    // Tracking-issue creation + dispatch delegate to CLI helpers in the
    // TS backend rather than inline shell.
    node_assert_1.strict.match(implementJob, /- name: Create implementation issue[\s\S]*if:\s*needs\.portal\.outputs\.target_kind != 'issue'[\s\S]*node \.agent\/dist\/cli\/create-issue\.js/);
    node_assert_1.strict.match(implementJob, /- name: Dispatch agent-implement[\s\S]*APPROVAL_COMMENT_URL: ""[\s\S]*node \.agent\/dist\/cli\/dispatch-agent-implement\.js/);
    node_assert_1.strict.match(implementJob, /SESSION_FORK_FROM_THREAD_KEY:\s*\$\{\{ github\.repository \}\}:\$\{\{ needs\.portal\.outputs\.target_kind \}\}:\$\{\{ needs\.portal\.outputs\.target_number \}\}:answer:default/);
    // Link-back comment on the originating PR/discussion points at the
    // tracking issue that was just created.
    node_assert_1.strict.match(implementJob, /- name: Post link-back to original surface[\s\S]*if:\s*needs\.portal\.outputs\.target_kind != 'issue'[\s\S]*node \.agent\/dist\/cli\/post-response\.js/);
    // agent-approve.yml uses the same CLIs — no duplicate inline shell.
    node_assert_1.strict.match(approveWorkflow, /node \.agent\/dist\/cli\/create-issue\.js/);
    node_assert_1.strict.match(approveWorkflow, /node \.agent\/dist\/cli\/dispatch-agent-implement\.js/);
    node_assert_1.strict.doesNotMatch(approveWorkflow, /actions\/workflows\/\$\{WORKFLOW\}\/dispatches/);
});
(0, node_test_1.test)("session bundle persistence is configurable through workflow inputs and AGENT_SESSION_BUNDLE_MODE", () => {
    const routerWorkflow = readRepoFile(".github/workflows/agent-router.yml");
    const implementWorkflow = readRepoFile(".github/workflows/agent-implement.yml");
    const fixPrWorkflow = readRepoFile(".github/workflows/agent-fix-pr.yml");
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    node_assert_1.strict.match(routerWorkflow, /session_bundle_mode:/);
    node_assert_1.strict.match(routerWorkflow, /AGENT_SESSION_BUNDLE_MODE/);
    node_assert_1.strict.match(routerWorkflow, /session_bundle_mode:\s*\$\{\{ inputs\.session_bundle_mode \|\| vars\.AGENT_SESSION_BUNDLE_MODE \|\| 'auto' \}\}/);
    node_assert_1.strict.match(implementWorkflow, /session_bundle_mode:[\s\S]*default:\s*""/);
    node_assert_1.strict.match(implementWorkflow, /session_fork_from_thread_key:[\s\S]*default:\s*""/);
    node_assert_1.strict.match(implementWorkflow, /vars\.AGENT_SESSION_BUNDLE_MODE/);
    node_assert_1.strict.match(fixPrWorkflow, /session_bundle_mode:[\s\S]*default:\s*""/);
    node_assert_1.strict.match(fixPrWorkflow, /vars\.AGENT_SESSION_BUNDLE_MODE/);
    node_assert_1.strict.match(reviewWorkflow, /session_bundle_mode:[\s\S]*default:\s*""/);
    node_assert_1.strict.match(reviewWorkflow, /vars\.AGENT_SESSION_BUNDLE_MODE/);
});
(0, node_test_1.test)("workflows use granular CLI helpers for post-processing", () => {
    const implementWorkflow = readRepoFile(".github/workflows/agent-implement.yml");
    const fixPrWorkflow = readRepoFile(".github/workflows/agent-fix-pr.yml");
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    node_assert_1.strict.match(implementWorkflow, /node \.agent\/dist\/cli\/add-label\.js/);
    node_assert_1.strict.match(implementWorkflow, /node \.agent\/dist\/cli\/verify\.js/);
    node_assert_1.strict.match(implementWorkflow, /node \.agent\/dist\/cli\/parse-response\.js/);
    node_assert_1.strict.match(implementWorkflow, /steps\.response\.outputs\.commit_message/);
    node_assert_1.strict.match(implementWorkflow, /node \.agent\/dist\/cli\/commit\.js/);
    node_assert_1.strict.match(implementWorkflow, /node \.agent\/dist\/cli\/create-pr\.js/);
    node_assert_1.strict.match(implementWorkflow, /node \.agent\/dist\/cli\/post-comment\.js/);
    node_assert_1.strict.match(fixPrWorkflow, /node \.agent\/dist\/cli\/verify\.js/);
    node_assert_1.strict.match(fixPrWorkflow, /node \.agent\/dist\/cli\/detect-head-change\.js/);
    node_assert_1.strict.ok(fixPrWorkflow.indexOf("node .agent/dist/cli/detect-head-change.js")
        < fixPrWorkflow.indexOf("node .agent/dist/cli/verify.js"));
    node_assert_1.strict.match(fixPrWorkflow, /HEAD_CHANGED:\s*\$\{\{ steps\.head\.outputs\.head_changed \}\}/);
    node_assert_1.strict.match(fixPrWorkflow, /VERIFY_BASE_SHA:\s*\$\{\{ steps\.pr\.outputs\.head_sha \}\}/);
    node_assert_1.strict.match(fixPrWorkflow, /steps\.commit\.outcome == 'failure'/);
    node_assert_1.strict.match(fixPrWorkflow, /steps\.push-head\.outcome == 'failure'/);
    node_assert_1.strict.match(fixPrWorkflow, /steps\.response\.outputs\.commit_message/);
    node_assert_1.strict.match(fixPrWorkflow, /node \.agent\/dist\/cli\/commit\.js/);
    node_assert_1.strict.match(fixPrWorkflow, /node \.agent\/dist\/cli\/push-pr-head\.js/);
    node_assert_1.strict.match(fixPrWorkflow, /node \.agent\/dist\/cli\/add-label\.js/);
    node_assert_1.strict.match(fixPrWorkflow, /node \.agent\/dist\/cli\/post-comment\.js/);
    node_assert_1.strict.match(reviewWorkflow, /node \.agent\/dist\/cli\/post-comment\.js/);
    node_assert_1.strict.match(reviewWorkflow, /AGENT_COLLAPSE_OLD_REVIEWS:\s*\$\{\{ vars\.AGENT_COLLAPSE_OLD_REVIEWS \}\}/);
});
(0, node_test_1.test)("shared run-agent-task action exists and requires explicit prompt/skill/lane/session_policy inputs", () => {
    const action = readRepoFile(".github/actions/run-agent-task/action.yml");
    node_assert_1.strict.match(action, /name: Run Agent Task/);
    node_assert_1.strict.match(action, /prompt:/);
    node_assert_1.strict.match(action, /skill:/);
    node_assert_1.strict.match(action, /lane:/);
    node_assert_1.strict.match(action, /session_policy:/);
    const sessionPolicyBlock = action.match(/session_policy:[\s\S]*?(?=^  [a-z_]+:|^outputs:)/m)?.[0] || "";
    node_assert_1.strict.match(sessionPolicyBlock, /required:\s*true/);
    node_assert_1.strict.doesNotMatch(sessionPolicyBlock, /default:/);
    node_assert_1.strict.match(action, /PROMPT_NAME/);
    node_assert_1.strict.match(action, /SKILL_NAME/);
    node_assert_1.strict.match(action, /LANE/);
    node_assert_1.strict.match(action, /SESSION_POLICY/);
    node_assert_1.strict.match(action, /\.agent\/dist\/run\.js/);
});
(0, node_test_1.test)("shared setup-agent-runtime action exists and is referenced by reusable workflows", () => {
    const action = readRepoFile(".github/actions/setup-agent-runtime/action.yml");
    const runnerWorkflow = readRepoFile(".github/workflows/agent-router.yml");
    node_assert_1.strict.match(action, /name: Setup Agent Runtime/);
    node_assert_1.strict.match(action, /actions\/setup-node/);
    node_assert_1.strict.match(action, /npm ci/);
    node_assert_1.strict.match(action, /npm run build/);
    node_assert_1.strict.match(runnerWorkflow, /\.\/\.github\/actions\/setup-agent-runtime/);
});
(0, node_test_1.test)("shared auth action supports the built-in hosted OIDC broker mode", () => {
    const action = readRepoFile(".github/actions/resolve-github-auth/action.yml");
    const oidcScript = readRepoFile(".github/actions/resolve-github-auth/exchange-oidc.sh");
    const runnerWorkflow = readRepoFile(".github/workflows/agent-router.yml");
    const approveWorkflow = readRepoFile(".github/workflows/agent-approve.yml");
    const implementWorkflow = readRepoFile(".github/workflows/agent-implement.yml");
    const fixPrWorkflow = readRepoFile(".github/workflows/agent-fix-pr.yml");
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    const entrypointWorkflow = readRepoFile(".github/workflows/agent-entrypoint.yml");
    const labelWorkflow = readRepoFile(".github/workflows/agent-label.yml");
    const memoryBootstrapWorkflow = readRepoFile(".github/workflows/agent-memory-bootstrap.yml");
    node_assert_1.strict.doesNotMatch(action, /oidc_exchange_url:/);
    node_assert_1.strict.doesNotMatch(action, /oidc_audience:/);
    node_assert_1.strict.match(action, /Validate direct GitHub App inputs/);
    node_assert_1.strict.match(action, /app_id and app_private_key must be configured together/);
    node_assert_1.strict.match(action, /bash "\$\{GITHUB_ACTION_PATH\}\/exchange-oidc\.sh"/);
    node_assert_1.strict.match(action, /https:\/\/oidc\.self-evolving\.app/);
    node_assert_1.strict.match(action, /OIDC_AUDIENCE:\s*sepo/);
    node_assert_1.strict.match(oidcScript, /ACTIONS_ID_TOKEN_REQUEST_URL/);
    node_assert_1.strict.match(oidcScript, /ACTIONS_ID_TOKEN_REQUEST_TOKEN/);
    node_assert_1.strict.match(oidcScript, /oidc_request_url=\"\$\{ACTIONS_ID_TOKEN_REQUEST_URL\}&audience=\$\{OIDC_AUDIENCE\}\"/);
    node_assert_1.strict.match(oidcScript, /for cmd in curl jq/);
    node_assert_1.strict.match(oidcScript, /run_with_retries\(\)/);
    node_assert_1.strict.match(oidcScript, /jq -r '\.value \/\/ empty' 2>\/dev\/null \|\| true/);
    node_assert_1.strict.match(oidcScript, /jq -r '\.token \/\/ \.app_token \/\/ empty' .*2>\/dev\/null \|\| true/);
    node_assert_1.strict.match(oidcScript, /--max-time 30/);
    node_assert_1.strict.match(oidcScript, /auth_mode=oidc_broker/);
    for (const workflow of [
        runnerWorkflow,
        approveWorkflow,
        implementWorkflow,
        fixPrWorkflow,
        reviewWorkflow,
        entrypointWorkflow,
        labelWorkflow,
        memoryBootstrapWorkflow,
    ]) {
        node_assert_1.strict.match(workflow, /id-token:\s*write/);
        node_assert_1.strict.doesNotMatch(workflow, /AGENT_OIDC_EXCHANGE_URL/);
        node_assert_1.strict.doesNotMatch(workflow, /AGENT_OIDC_AUDIENCE/);
    }
});
(0, node_test_1.test)("shared run-agent-task action wires session bundle restore and upload around the agent run", () => {
    const action = readRepoFile(".github/actions/run-agent-task/action.yml");
    node_assert_1.strict.match(action, /session_bundle_mode:/);
    node_assert_1.strict.match(action, /session_bundle_retention_days:/);
    node_assert_1.strict.match(action, /session_fork_from_thread_key:/);
    node_assert_1.strict.match(action, /Restore session bundle/);
    node_assert_1.strict.match(action, /Restore session bundle[\s\S]*continue-on-error:\s*true/);
    node_assert_1.strict.match(action, /node \.agent\/dist\/cli\/session-restore\.js/);
    node_assert_1.strict.match(action, /Prepare session bundle/);
    node_assert_1.strict.match(action, /node \.agent\/dist\/cli\/session-backup\.js/);
    node_assert_1.strict.match(action, /Prepare session bundle[\s\S]*steps\.run\.outputs\.exit_code == '0'/);
    node_assert_1.strict.match(action, /Upload session bundle artifact[\s\S]*steps\.run\.outputs\.exit_code == '0'/);
    node_assert_1.strict.match(action, /actions\/upload-artifact@v4/);
    node_assert_1.strict.match(action, /Register session bundle artifact[\s\S]*steps\.run\.outputs\.exit_code == '0'/);
    node_assert_1.strict.match(action, /node \.agent\/dist\/cli\/session-register\.js/);
    node_assert_1.strict.match(action, /resume_status:/);
    node_assert_1.strict.match(action, /session_bundle_restore_status:/);
    node_assert_1.strict.match(action, /session_fork_restore_status:/);
    node_assert_1.strict.match(action, /SESSION_FORK_FROM_THREAD_KEY:\s*\$\{\{\s*inputs\.session_fork_from_thread_key\s*\}\}/);
    node_assert_1.strict.match(action, /SESSION_FORK_ACPX_SESSION_ID:\s*\$\{\{\s*steps\.restore\.outputs\.fork_acpx_session_id\s*\}\}/);
});
(0, node_test_1.test)("workflows declare explicit session policies", () => {
    const runnerWorkflow = readRepoFile(".github/workflows/agent-router.yml");
    const fixPrWorkflow = readRepoFile(".github/workflows/agent-fix-pr.yml");
    const implementWorkflow = readRepoFile(".github/workflows/agent-implement.yml");
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    node_assert_1.strict.match(runnerWorkflow, /prompt:\s*dispatch[\s\S]*session_policy:\s*none/);
    node_assert_1.strict.match(runnerWorkflow, /prompt:\s*answer[\s\S]*session_policy:\s*resume-best-effort/);
    node_assert_1.strict.match(fixPrWorkflow, /prompt:\s*fix-pr[\s\S]*session_policy:\s*resume-best-effort/);
    node_assert_1.strict.match(implementWorkflow, /prompt:\s*\$\{\{ env\.IMPLEMENTATION_PROMPT \}\}[\s\S]*session_fork_from_thread_key:\s*\$\{\{ inputs\.session_fork_from_thread_key \}\}/);
    node_assert_1.strict.match(implementWorkflow, /route:\s*\$\{\{ env\.IMPLEMENTATION_ROUTE \}\}[\s\S]*session_policy:\s*\$\{\{ inputs\.session_fork_from_thread_key != '' && 'resume-best-effort' \|\| 'track-only' \}\}/);
    node_assert_1.strict.match(reviewWorkflow, /prompt:\s*review[\s\S]*session_policy:\s*track-only/);
    node_assert_1.strict.match(reviewWorkflow, /agent-rubrics-review\.yml/);
    node_assert_1.strict.match(reviewWorkflow, /prompt:\s*review-synthesize[\s\S]*session_policy:\s*track-only/);
});
(0, node_test_1.test)("review workflow declares distinct lanes for reviewer jobs and synthesis", () => {
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    node_assert_1.strict.match(reviewWorkflow, /lane:\s*claude-review/);
    node_assert_1.strict.match(reviewWorkflow, /lane:\s*codex-review/);
    node_assert_1.strict.match(reviewWorkflow, /lane:\s*synthesize/);
});
(0, node_test_1.test)("workflow docs record the minimal metadata contract and developer notes", () => {
    const keyConcepts = readRepoFile(".agent/docs/technical-details/key-concepts.md");
    const memoryArchitecture = readRepoFile(".agent/docs/architecture/memory.md");
    const rubricsArchitecture = readRepoFile(".agent/docs/architecture/rubrics.md");
    const rubricsInitializationWorkflow = readRepoFile(".github/workflows/agent-rubrics-initialization.yml");
    const rubricsInitializationPrompt = readRepoFile(".github/prompts/rubrics-initialization.md");
    const supportedWorkflows = readRepoFile(".agent/docs/architecture/supported-workflows.md");
    const requestLifecycle = readRepoFile(".agent/docs/architecture/request-lifecycle.md");
    const configurationList = readRepoFile(".agent/docs/customization/configuration-list.md");
    const existingRepoInstall = readRepoFile(".agent/docs/deployment/install-existing-repository.md");
    const developerNotes = readRepoFile(".agent/docs/technical-details/developer-notes.md");
    node_assert_1.strict.match(keyConcepts, /### RuntimeEnvelope/);
    node_assert_1.strict.match(keyConcepts, /Envelope version, currently `1`/);
    node_assert_1.strict.match(keyConcepts, /`thread_key`/);
    node_assert_1.strict.match(keyConcepts, /repo:target_kind:target_number:route:lane/);
    node_assert_1.strict.match(keyConcepts, /`issue`, `pull_request`, `discussion`, or `repository`/);
    node_assert_1.strict.match(keyConcepts, /target_number=0/);
    node_assert_1.strict.match(supportedWorkflows, /agent-label\.yml/);
    node_assert_1.strict.match(supportedWorkflows, /agent-branch-cleanup\.yml/);
    node_assert_1.strict.match(supportedWorkflows, /### Core workflows/i);
    node_assert_1.strict.match(supportedWorkflows, /### Repository memory workflows/i);
    node_assert_1.strict.match(supportedWorkflows, /Agent \/ Memory \/ Initialization/);
    node_assert_1.strict.match(supportedWorkflows, /Agent \/ Memory \/ Sync GitHub Artifacts/);
    node_assert_1.strict.match(supportedWorkflows, /Agent \/ Memory \/ Record PR Closure/);
    node_assert_1.strict.match(supportedWorkflows, /Agent \/ Memory \/ Curate Recent Activity/);
    node_assert_1.strict.match(supportedWorkflows, /Agent \/ Memory \/ Initialization[\s\S]*\|\s*Auto\s*\|/);
    node_assert_1.strict.match(supportedWorkflows, /Agent \/ Rubrics \/ Review/);
    node_assert_1.strict.match(supportedWorkflows, /Agent \/ Rubrics \/ Initialization/);
    node_assert_1.strict.match(supportedWorkflows, /Agent \/ Rubrics \/ Update/);
    node_assert_1.strict.doesNotMatch(supportedWorkflows.match(/### Core workflows[\s\S]*?### Repository memory workflows/)?.[0] || "", /agent-rubrics-/);
    node_assert_1.strict.match(supportedWorkflows, /agent\/s\/<skill>/);
    node_assert_1.strict.match(supportedWorkflows, /removes[\s\S]*triggering `agent\/\*` label/i);
    node_assert_1.strict.match(supportedWorkflows, /strips code blocks[\s\S]*quoted text/i);
    node_assert_1.strict.match(supportedWorkflows, /OWNER[\s\S]*MEMBER[\s\S]*COLLABORATOR[\s\S]*CONTRIBUTOR/);
    node_assert_1.strict.match(memoryArchitecture, /Agent \/ Memory \/ Initialization[\s\S]*\|\s*Auto\s*\|/);
    node_assert_1.strict.match(rubricsArchitecture, /agent\/rubrics/);
    node_assert_1.strict.match(rubricsArchitecture, /AGENT_RUBRICS_POLICY/);
    node_assert_1.strict.match(rubricsArchitecture, /agent\/memory` stores agent\/project continuity/i);
    node_assert_1.strict.match(rubricsArchitecture, /Agent \/ Rubrics \/ Initialization/);
    node_assert_1.strict.match(rubricsInitializationWorkflow, /^name: Agent \/ Rubrics \/ Initialization$/m);
    node_assert_1.strict.match(rubricsInitializationWorkflow, /Reject existing rubrics branch/);
    node_assert_1.strict.match(rubricsInitializationWorkflow, /prompt:\s*rubrics-initialization/);
    node_assert_1.strict.match(rubricsInitializationWorkflow, /route:\s*rubrics-initialization/);
    node_assert_1.strict.match(rubricsInitializationWorkflow, /rubrics_mode_override:\s*'enabled'/);
    node_assert_1.strict.match(rubricsInitializationWorkflow, /initialization_context:/);
    node_assert_1.strict.match(rubricsInitializationWorkflow, /rubrics_ref:[\s\S]*default: agent\/rubrics/);
    node_assert_1.strict.match(rubricsInitializationWorkflow, /inputs\.rubrics_ref \|\| vars\.AGENT_RUBRICS_REF \|\| 'agent\/rubrics'/);
    node_assert_1.strict.doesNotMatch(rubricsInitializationWorkflow, /description: "GitHub login that requested the run"/);
    node_assert_1.strict.doesNotMatch(rubricsInitializationWorkflow, /^      session_bundle_mode:/m);
    node_assert_1.strict.match(rubricsInitializationWorkflow, /requested_by:\s*\$\{\{\s*github\.repository_owner\s*\}\}/);
    node_assert_1.strict.match(rubricsInitializationWorkflow, /session_bundle_mode:\s*\$\{\{\s*vars\.AGENT_SESSION_BUNDLE_MODE \|\| 'auto'\s*\}\}/);
    node_assert_1.strict.match(rubricsInitializationPrompt, /Initialization context:/);
    node_assert_1.strict.match(rubricsInitializationPrompt, /OWNER[\s\S]*MEMBER[\s\S]*COLLABORATOR/);
    node_assert_1.strict.match(rubricsArchitecture, /Only rubric initialization bootstraps a missing branch/);
    node_assert_1.strict.match(rubricsArchitecture, /Dispatch triage is always rubric-disabled/);
    node_assert_1.strict.match(rubricsArchitecture, /honor `AGENT_RUBRICS_POLICY`/);
    node_assert_1.strict.match(existingRepoInstall, /cannot silently skip persistence/);
    node_assert_1.strict.match(requestLifecycle, /route access follows the configured trigger access policy/);
    node_assert_1.strict.match(requestLifecycle, /agent\/<route>-<target_kind>-<number>\/<agent>-<run_id>/);
    node_assert_1.strict.match(configurationList, /AGENT_RUNS_ON/);
    node_assert_1.strict.match(configurationList, /AGENT_MEMORY_POLICY/);
    node_assert_1.strict.match(configurationList, /AGENT_MEMORY_REF/);
    node_assert_1.strict.match(configurationList, /AGENT_RUBRICS_POLICY/);
    node_assert_1.strict.match(configurationList, /AGENT_RUBRICS_REF/);
    node_assert_1.strict.match(configurationList, /AGENT_RUBRICS_LIMIT/);
    node_assert_1.strict.match(configurationList, /AGENT_SESSION_BUNDLE_MODE/);
    node_assert_1.strict.match(configurationList, /AGENT_AUTOMATION_MODE/);
    node_assert_1.strict.match(configurationList, /AGENT_AUTOMATION_MAX_ROUNDS/);
    node_assert_1.strict.match(configurationList, /AGENT_STATUS_LABEL_ENABLED/);
    node_assert_1.strict.match(existingRepoInstall, /open a normal PR in the target repository/i);
    node_assert_1.strict.match(existingRepoInstall, /`\.github\/`/);
    node_assert_1.strict.match(existingRepoInstall, /workflows, composite actions, and prompt templates/i);
    node_assert_1.strict.match(existingRepoInstall, /Agent \/ Memory \/ Initialization/);
    node_assert_1.strict.match(existingRepoInstall, /Alternative: local memory bootstrap/);
    node_assert_1.strict.match(existingRepoInstall, /first-run initializer/i);
    node_assert_1.strict.match(existingRepoInstall, /does not require[\s\S]*agent\/memory[\s\S]*to exist yet/i);
    node_assert_1.strict.match(existingRepoInstall, /rejects the run if[\s\S]*already exists/i);
    node_assert_1.strict.match(existingRepoInstall, /initial GitHub artifact sync/i);
    node_assert_1.strict.match(existingRepoInstall, /recent-activity curation inline/i);
    node_assert_1.strict.match(existingRepoInstall, /Agent \/ Rubrics \/ Initialization/);
    node_assert_1.strict.match(existingRepoInstall, /supplied context/i);
    node_assert_1.strict.match(developerNotes, /## Testing/);
    node_assert_1.strict.match(developerNotes, /cd \.agent[\s\S]*npm test/);
    node_assert_1.strict.match(developerNotes, /## Known limitations/);
    node_assert_1.strict.match(developerNotes, /`skill_root`/);
    node_assert_1.strict.match(developerNotes, /\/skill/);
    node_assert_1.strict.match(developerNotes, /lazy blockquote/);
    node_assert_1.strict.match(developerNotes, /lightweight post-agent check/);
});
(0, node_test_1.test)("create-action prompt uses native workflows with shared expiration and runtime guardrails", () => {
    const prompt = readRepoFile(".github/prompts/agent-create-action.md");
    const docs = readRepoFile(".agent/docs/customization/creating-your-own-actions.md");
    const template = readRepoFile(".agent/action-templates/agent-action-template.yml");
    const internalActions = readRepoFile(".agent/docs/actions/internal-actions.md");
    const action = readRepoFile(".github/actions/check-agent-action-expiration/action.yml");
    const script = readRepoFile(".github/actions/check-agent-action-expiration/check-expiration.sh");
    for (const content of [prompt, docs]) {
        node_assert_1.strict.match(content, /\.agent\/action-templates\/agent-action-template\.yml/);
        node_assert_1.strict.match(content, /check-agent-action-expiration/);
        node_assert_1.strict.match(content, /steps\.expiration\.outputs\.expired != 'true'/);
        node_assert_1.strict.match(content, /issues: write/);
        node_assert_1.strict.doesNotMatch(content, /date -u -d/);
    }
    node_assert_1.strict.match(template, /uses: \.\/\.github\/actions\/check-agent-action-expiration/);
    node_assert_1.strict.match(template, /uses: \.\/\.github\/actions\/resolve-github-auth/);
    node_assert_1.strict.match(template, /uses: \.\/\.github\/actions\/resolve-agent-provider/);
    node_assert_1.strict.match(template, /uses: \.\/\.github\/actions\/setup-agent-runtime/);
    node_assert_1.strict.match(template, /uses: \.\/\.github\/actions\/run-agent-task/);
    node_assert_1.strict.match(template, /steps\.expiration\.outputs\.expired != 'true'/);
    node_assert_1.strict.match(template, /permission_mode:\s*approve-all/);
    node_assert_1.strict.match(template, /memory_mode_override:\s*read-only/);
    node_assert_1.strict.match(template, /session_policy:\s*track-only/);
    node_assert_1.strict.match(template, /Post report to issue/);
    node_assert_1.strict.match(template, /add issue write permission/i);
    node_assert_1.strict.doesNotMatch(template, /^\s*issues:\s*write\s*$/m);
    node_assert_1.strict.doesNotMatch(template, /date -u -d/);
    node_assert_1.strict.match(internalActions, /check-agent-action-expiration/);
    node_assert_1.strict.match(action, /expires_at:/);
    node_assert_1.strict.match(action, /check-expiration\.sh/);
    node_assert_1.strict.match(script, /date -u \+%Y-%m-%d/);
    node_assert_1.strict.doesNotMatch(script, /date -u -d/);
});
(0, node_test_1.test)("agent implement prompt input falls back to implementation route", () => {
    const implementWorkflow = readRepoFile(".github/workflows/agent-implement.yml");
    const implementationPromptDefaults = implementWorkflow.match(/implementation_prompt:[\s\S]*?default:\s*""/g) || [];
    node_assert_1.strict.equal(implementationPromptDefaults.length, 2);
    node_assert_1.strict.match(implementWorkflow, /IMPLEMENTATION_PROMPT:\s*\$\{\{\s*inputs\.implementation_prompt \|\| inputs\.implementation_route \|\| 'implement'\s*\}\}/);
});
(0, node_test_1.test)("execution workflows expose automation handoff inputs", () => {
    const entrypointWorkflow = readRepoFile(".github/workflows/agent-entrypoint.yml");
    const labelWorkflow = readRepoFile(".github/workflows/agent-label.yml");
    const runnerWorkflow = readRepoFile(".github/workflows/agent-router.yml");
    const approveWorkflow = readRepoFile(".github/workflows/agent-approve.yml");
    const orchestratorWorkflow = readRepoFile(".github/workflows/agent-orchestrator.yml");
    const implementWorkflow = readRepoFile(".github/workflows/agent-implement.yml");
    const fixPrWorkflow = readRepoFile(".github/workflows/agent-fix-pr.yml");
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    const runSource = readRepoFile(".agent/src/run.ts");
    const orchestrateHandoffCli = readRepoFile(".agent/src/cli/orchestrate-handoff.ts");
    const fixPrPrompt = readRepoFile(".github/prompts/agent-fix-pr.md");
    const orchestratorPrompt = readRepoFile(".github/prompts/agent-orchestrator.md");
    const orchestratorDoc = readRepoFile(".agent/docs/technical-details/agent-orchestrator.md");
    node_assert_1.strict.match(entrypointWorkflow, /automation_mode:\s*\$\{\{ vars\.AGENT_AUTOMATION_MODE \|\| 'disabled' \}\}/);
    node_assert_1.strict.match(labelWorkflow, /automation_mode:\s*\$\{\{ vars\.AGENT_AUTOMATION_MODE \|\| 'disabled' \}\}/);
    node_assert_1.strict.match(runnerWorkflow, /automation_mode:/);
    node_assert_1.strict.match(approveWorkflow, /AUTOMATION_MODE:\s*\$\{\{ vars\.AGENT_AUTOMATION_MODE \|\| 'disabled' \}\}/);
    node_assert_1.strict.match(orchestratorWorkflow, /name: Agent \/ Orchestrator/);
    node_assert_1.strict.match(orchestratorWorkflow, /source_run_id:/);
    node_assert_1.strict.match(orchestratorWorkflow, /issues: write/);
    node_assert_1.strict.match(orchestratorWorkflow, /uses: \.\/\.github\/actions\/resolve-agent-provider/);
    node_assert_1.strict.match(orchestratorWorkflow, /route:\s*orchestrator/);
    node_assert_1.strict.match(orchestratorWorkflow, /node \.agent\/dist\/cli\/orchestrator-preflight\.js/);
    node_assert_1.strict.match(orchestratorWorkflow, /install_claude:\s*\$\{\{\s*steps\.provider\.outputs\.install_claude\s*\}\}/);
    node_assert_1.strict.match(orchestratorWorkflow, /prompt:\s*orchestrator/);
    node_assert_1.strict.match(orchestratorWorkflow, /session_policy:\s*resume-best-effort/);
    node_assert_1.strict.match(orchestratorWorkflow, /continue-on-error:\s*true/);
    node_assert_1.strict.match(orchestratorWorkflow, /rubrics_mode_override:\s*read-only/);
    node_assert_1.strict.match(orchestratorWorkflow, /agent:\s*\$\{\{\s*steps\.provider\.outputs\.provider\s*\}\}/);
    node_assert_1.strict.match(orchestratorWorkflow, /node \.agent\/dist\/cli\/orchestrate-handoff\.js/);
    for (const workflow of [implementWorkflow, fixPrWorkflow, reviewWorkflow]) {
        node_assert_1.strict.match(workflow, /automation_mode:/);
        node_assert_1.strict.match(workflow, /automation_current_round:/);
        node_assert_1.strict.match(workflow, /automation_max_rounds:/);
        node_assert_1.strict.match(workflow, /inputs\.automation_mode == 'true'/);
        node_assert_1.strict.match(workflow, /inputs\.automation_mode == 'heuristics'/);
        node_assert_1.strict.match(workflow, /inputs\.automation_mode == 'agent'/);
        node_assert_1.strict.doesNotMatch(workflow, /inputs\.automation_mode == 'heuristic'/);
        node_assert_1.strict.doesNotMatch(workflow, /inputs\.automation_mode == 'deterministic'/);
        node_assert_1.strict.match(workflow, /node \.agent\/dist\/cli\/dispatch-agent-orchestrator\.js/);
    }
    node_assert_1.strict.match(implementWorkflow, /NEXT_TARGET_NUMBER:\s*\$\{\{ steps\.pr\.outputs\.pr_number \}\}/);
    node_assert_1.strict.match(reviewWorkflow, /id: post_comment/);
    node_assert_1.strict.match(reviewWorkflow, /RESPONSE_FILE:\s*\$\{\{ steps\.synthesis\.outputs\.response_file \}\}/);
    node_assert_1.strict.match(reviewWorkflow, /steps\.post_comment\.outcome == 'success'/);
    node_assert_1.strict.match(orchestratorWorkflow, /PLANNER_RESPONSE_FILE:\s*\$\{\{ steps\.planner\.outputs\.response_file \}\}/);
    node_assert_1.strict.match(orchestrateHandoffCli, /orchestrator_context:\s*decision\.handoffContext/);
    node_assert_1.strict.match(fixPrWorkflow, /orchestrator_context:/);
    node_assert_1.strict.match(fixPrWorkflow, /ORCHESTRATOR_CONTEXT:\s*\$\{\{ inputs\.orchestrator_context \}\}/);
    node_assert_1.strict.match(fixPrPrompt, /\$\{ORCHESTRATOR_CONTEXT\}/);
    node_assert_1.strict.match(orchestratorPrompt, /"handoff_context"/);
    node_assert_1.strict.match(runSource, /"ORCHESTRATOR_CONTEXT"/);
    node_assert_1.strict.match(orchestratorDoc, /Implement --> Review: success \+ PR created/);
    node_assert_1.strict.match(orchestratorDoc, /workflow_dispatch/);
    node_assert_1.strict.match(orchestratorDoc, /handoff_context/);
});
(0, node_test_1.test)("workflow docs cover hosted auth and self-hosting paths", () => {
    const setupGuide = readRepoFile(".agent/docs/deployment/setup-guide.md");
    const selfHostedRunner = readRepoFile(".agent/docs/deployment/self-hosted-github-action-runner.md");
    node_assert_1.strict.match(setupGuide, /Official Sepo-hosted app/);
    node_assert_1.strict.match(setupGuide, /works without\s+extra repository configuration/);
    node_assert_1.strict.doesNotMatch(setupGuide, /AGENT_OIDC_EXCHANGE_URL/);
    node_assert_1.strict.doesNotMatch(setupGuide, /AGENT_OIDC_AUDIENCE/);
    node_assert_1.strict.match(setupGuide, /Bring your own GitHub App/);
    node_assert_1.strict.match(setupGuide, /`AGENT_PAT`/);
    node_assert_1.strict.match(setupGuide, /Contents:\*\* read and write/);
    node_assert_1.strict.match(setupGuide, /### Auth priority/);
    node_assert_1.strict.match(setupGuide, /1\. direct GitHub App token[\s\S]*2\. official OIDC broker exchange[\s\S]*3\. `AGENT_PAT`[\s\S]*4\. fallback workflow token `github\.token`/);
    node_assert_1.strict.match(setupGuide, /fallback workflow token `github\.token`/i);
    node_assert_1.strict.doesNotMatch(setupGuide, /"oidc_token"/);
    node_assert_1.strict.match(selfHostedRunner, /infrastructure you operate/);
    node_assert_1.strict.match(selfHostedRunner, /`git`, `gh`, `jq`, `curl`, `bash`, and network/);
});
(0, node_test_1.test)("buildEnvelope produces a valid envelope with all fields", () => {
    const envelope = (0, envelope_js_1.buildEnvelope)(VALID_PARAMS);
    node_assert_1.strict.equal(envelope.schema_version, envelope_js_1.SCHEMA_VERSION);
    node_assert_1.strict.equal(envelope.repo_slug, "self-evolving/repo");
    node_assert_1.strict.equal(envelope.route, "review");
    node_assert_1.strict.equal(envelope.source_kind, "issue_comment");
    node_assert_1.strict.equal(envelope.target_kind, "pull_request");
    node_assert_1.strict.equal(envelope.target_number, 42);
    node_assert_1.strict.equal(envelope.target_url, "https://github.com/self-evolving/repo/pull/42");
    node_assert_1.strict.equal(envelope.request_text, "please review this");
    node_assert_1.strict.equal(envelope.requested_by, "lolipopshock");
    node_assert_1.strict.equal(envelope.approval_comment_url, null);
    node_assert_1.strict.equal(envelope.lane, "default");
    node_assert_1.strict.equal(envelope.thread_key, "self-evolving/repo:pull_request:42:review:default");
});
(0, node_test_1.test)("buildEnvelope uses the default lane when lane is not provided", () => {
    const envelope = (0, envelope_js_1.buildEnvelope)(VALID_PARAMS);
    node_assert_1.strict.equal(envelope.lane, "default");
});
(0, node_test_1.test)("buildEnvelope respects explicit lane", () => {
    const envelope = (0, envelope_js_1.buildEnvelope)({ ...VALID_PARAMS, lane: "portal" });
    node_assert_1.strict.equal(envelope.lane, "portal");
    node_assert_1.strict.equal(envelope.thread_key, "self-evolving/repo:pull_request:42:review:portal");
});
(0, node_test_1.test)("buildEnvelope sets workflow when provided", () => {
    const envelope = (0, envelope_js_1.buildEnvelope)({ ...VALID_PARAMS, workflow: "agent-review.yml" });
    node_assert_1.strict.equal(envelope.workflow, "agent-review.yml");
});
(0, node_test_1.test)("buildEnvelope preserves approval_comment_url", () => {
    const url = "https://github.com/self-evolving/repo/issues/21#issuecomment-123";
    const envelope = (0, envelope_js_1.buildEnvelope)({ ...VALID_PARAMS, approval_comment_url: url });
    node_assert_1.strict.equal(envelope.approval_comment_url, url);
});
(0, node_test_1.test)("validateEnvelope passes for a valid envelope", () => {
    const envelope = (0, envelope_js_1.buildEnvelope)(VALID_PARAMS);
    const errors = (0, envelope_js_1.validateEnvelope)(envelope);
    node_assert_1.strict.deepEqual(errors, []);
});
(0, node_test_1.test)("validateEnvelope catches missing required fields", () => {
    const envelope = (0, envelope_js_1.buildEnvelope)({ ...VALID_PARAMS, repo_slug: "", target_number: 0 });
    const errors = (0, envelope_js_1.validateEnvelope)(envelope);
    node_assert_1.strict.ok(errors.some((error) => error.includes("repo_slug")));
    node_assert_1.strict.ok(errors.some((error) => error.includes("target_number")));
});
(0, node_test_1.test)("validateEnvelope catches invalid route", () => {
    const envelope = (0, envelope_js_1.buildEnvelope)({ ...VALID_PARAMS, route: "deploy" });
    const errors = (0, envelope_js_1.validateEnvelope)(envelope);
    node_assert_1.strict.ok(errors.some((error) => error.includes("Invalid route")));
});
(0, node_test_1.test)("validateEnvelope accepts dispatch, action, and rubrics as first-class routes", () => {
    for (const route of [
        "dispatch",
        "create-action",
        "rubrics-review",
        "rubrics-initialization",
        "rubrics-update",
    ]) {
        const envelope = (0, envelope_js_1.buildEnvelope)({ ...VALID_PARAMS, route });
        const errors = (0, envelope_js_1.validateEnvelope)(envelope);
        node_assert_1.strict.deepEqual(errors, []);
    }
});
(0, node_test_1.test)("validateEnvelope catches invalid source_kind", () => {
    const envelope = (0, envelope_js_1.buildEnvelope)({ ...VALID_PARAMS, source_kind: "webhook" });
    const errors = (0, envelope_js_1.validateEnvelope)(envelope);
    node_assert_1.strict.ok(errors.some((error) => error.includes("Invalid source_kind")));
});
(0, node_test_1.test)("validateEnvelope catches invalid target_kind", () => {
    const envelope = (0, envelope_js_1.buildEnvelope)({ ...VALID_PARAMS, target_kind: "commit" });
    const errors = (0, envelope_js_1.validateEnvelope)(envelope);
    node_assert_1.strict.ok(errors.some((error) => error.includes("Invalid target_kind")));
});
(0, node_test_1.test)("buildThreadKey is deterministic", () => {
    node_assert_1.strict.equal((0, envelope_js_1.buildThreadKey)({
        repo_slug: "self-evolving/repo",
        target_kind: "issue",
        target_number: 21,
        route: "implement",
    }), "self-evolving/repo:issue:21:implement:default");
});
(0, node_test_1.test)("buildEnvelopeFromEventContext maps event context into an envelope", () => {
    const envelope = (0, envelope_js_1.buildEnvelopeFromEventContext)({
        body: "please implement",
        sourceKind: "issue_comment",
        targetKind: "issue",
        targetNumber: "21",
        targetUrl: "https://github.com/self-evolving/repo/issues/21",
    }, {
        repo_slug: "self-evolving/repo",
        route: "implement",
        requested_by: "alice",
        workflow: "agent-implement.yml",
        lane: "default",
    });
    node_assert_1.strict.equal(envelope.target_number, 21);
    node_assert_1.strict.equal(envelope.request_text, "please implement");
    node_assert_1.strict.equal(envelope.requested_by, "alice");
    node_assert_1.strict.equal(envelope.workflow, "agent-implement.yml");
});
(0, node_test_1.test)("envelopeToPromptVars exposes the prompt contract", () => {
    const envelope = (0, envelope_js_1.buildEnvelope)(VALID_PARAMS);
    node_assert_1.strict.deepEqual((0, envelope_js_1.envelopeToPromptVars)(envelope), {
        REPO_SLUG: "self-evolving/repo",
        ROUTE: "review",
        SOURCE_KIND: "issue_comment",
        TARGET_KIND: "pull_request",
        TARGET_NUMBER: "42",
        TARGET_URL: "https://github.com/self-evolving/repo/pull/42",
        REQUEST_TEXT: "please review this",
        MENTION_BODY: "please review this",
        REQUESTED_BY: "lolipopshock",
        WORKFLOW: "",
        LANE: "default",
        THREAD_KEY: "self-evolving/repo:pull_request:42:review:default",
    });
});
(0, node_test_1.test)("repository target kind accepts target_number=0", () => {
    const envelope = (0, envelope_js_1.buildEnvelope)({
        ...VALID_PARAMS,
        source_kind: "workflow_dispatch",
        target_kind: "repository",
        target_number: 0,
        target_url: "https://github.com/self-evolving/repo",
    });
    node_assert_1.strict.deepEqual((0, envelope_js_1.validateEnvelope)(envelope), []);
});
(0, node_test_1.test)("non-repository target kinds still require target_number", () => {
    const envelope = (0, envelope_js_1.buildEnvelope)({
        ...VALID_PARAMS,
        target_number: 0,
    });
    const errors = (0, envelope_js_1.validateEnvelope)(envelope);
    node_assert_1.strict.ok(errors.some((e) => /target_number/.test(e)));
});
(0, node_test_1.test)("run-agent-task resolves memory mode from policy and threads memory env to the agent", () => {
    const action = readRepoFile(".github/actions/run-agent-task/action.yml");
    const commitCli = readRepoFile(".agent/src/cli/commit.ts");
    node_assert_1.strict.match(action, /memory_policy:/);
    node_assert_1.strict.match(action, /memory_mode_override:/);
    node_assert_1.strict.match(action, /memory_ref:/);
    node_assert_1.strict.doesNotMatch(action, /memory_bootstrap_if_missing:/);
    node_assert_1.strict.doesNotMatch(action, /memory_repository:/);
    node_assert_1.strict.doesNotMatch(action, /memory_path:/);
    node_assert_1.strict.doesNotMatch(action, /memory_commit_message:/);
    node_assert_1.strict.match(action, /AGENT_MEMORY_POLICY:\s*\$\{\{\s*inputs\.memory_policy\s*\}\}/);
    node_assert_1.strict.doesNotMatch(action, /vars\.AGENT_MEMORY_POLICY/);
    node_assert_1.strict.match(action, /cli\/memory\/resolve-policy\.js/);
    node_assert_1.strict.match(action, /steps\.memory_mode\.outputs\.read_enabled == 'true'/);
    node_assert_1.strict.match(action, /steps\.memory_mode\.outputs\.write_enabled == 'true'/);
    // Commit must be gated on a clean agent exit, not just always().
    node_assert_1.strict.match(action, /steps\.run\.outputs\.exit_code == '0'/);
    node_assert_1.strict.match(action, /Set up agent memory/);
    node_assert_1.strict.match(action, /MEMORY_AVAILABLE:\s*\$\{\{\s*steps\.memory\.outputs\.memory_available\s*\}\}/);
    node_assert_1.strict.match(action, /MEMORY_DIR:\s*\$\{\{\s*steps\.memory\.outputs\.memory_dir\s*\}\}/);
    node_assert_1.strict.match(action, /MEMORY_REF:\s*\$\{\{\s*steps\.memory\.outputs\.memory_ref\s*\}\}/);
    node_assert_1.strict.doesNotMatch(action, /PROMPT_VAR_MEMORY_/);
    node_assert_1.strict.match(action, /Commit memory edits/);
    node_assert_1.strict.match(action, /COMMIT_CWD:\s*\$\{\{\s*steps\.memory\.outputs\.memory_dir\s*\}\}/);
    node_assert_1.strict.doesNotMatch(action, /GITHUB_WORKSPACE:\s*\$\{\{\s*steps\.memory\.outputs\.memory_dir\s*\}\}/);
    node_assert_1.strict.match(action, /bootstrap_if_missing:\s*\$\{\{\s*inputs\.memory_mode_override == 'enabled' && 'true' \|\| 'false'\s*\}\}/);
    node_assert_1.strict.match(action, /Report memory commit failure/);
    node_assert_1.strict.match(action, /steps\.commit_memory\.outcome == 'failure'/);
    node_assert_1.strict.match(action, /::warning title=Memory commit failed::/);
    node_assert_1.strict.match(action, /\.\/\.github\/actions\/download-agent-memory/);
    node_assert_1.strict.match(commitCli, /process\.env\.COMMIT_CWD \|\| process\.env\.GITHUB_WORKSPACE/);
});
(0, node_test_1.test)("run-agent-task only bootstraps missing rubrics for first-run initialization", () => {
    const action = readRepoFile(".github/actions/run-agent-task/action.yml");
    const rubricsPrompt = readRepoFile(".github/prompts/_rubrics.md");
    node_assert_1.strict.match(action, /bootstrap_if_missing:\s*\$\{\{\s*inputs\.route == 'rubrics-initialization' && inputs\.rubrics_mode_override == 'enabled' && 'true' \|\| 'false'\s*\}\}/);
    node_assert_1.strict.match(action, /Require rubric initialization commit/);
    node_assert_1.strict.match(action, /Rubrics initialization did not persist/);
    node_assert_1.strict.match(action, /Report rubrics validation failure/);
    node_assert_1.strict.match(action, /steps\.validate_rubrics\.outcome == 'failure'/);
    node_assert_1.strict.match(action, /::warning title=Rubrics validation failed::/);
    node_assert_1.strict.match(action, /RUBRICS_SELECT_ALL_ROUTES:\s*\$\{\{\s*inputs\.route == 'rubrics-review' && 'true' \|\| 'false'\s*\}\}/);
    node_assert_1.strict.match(action, /RUBRICS_LIMIT:\s*\$\{\{\s*inputs\.route == 'rubrics-review' && 'all' \|\| inputs\.rubrics_limit\s*\}\}/);
    node_assert_1.strict.match(action, /all_route_args\+=\(--all-routes\)/);
    node_assert_1.strict.match(action, /"\$\{all_route_args\[@\]\}"/);
    node_assert_1.strict.match(rubricsPrompt, /Agent \/ Rubrics \/ Initialization and Agent \/ Rubrics \/ Update/);
});
(0, node_test_1.test)("normal workflows honor rubrics policy instead of forcing read-only", () => {
    const implementWorkflow = readRepoFile(".github/workflows/agent-implement.yml");
    const fixPrWorkflow = readRepoFile(".github/workflows/agent-fix-pr.yml");
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    const rubricsReviewWorkflow = readRepoFile(".github/workflows/agent-rubrics-review.yml");
    const rubricsInitializationWorkflow = readRepoFile(".github/workflows/agent-rubrics-initialization.yml");
    const rubricsInitializationPrompt = readRepoFile(".github/prompts/rubrics-initialization.md");
    const rubricsUpdateWorkflow = readRepoFile(".github/workflows/agent-rubrics-update.yml");
    const rubricsUpdatePrompt = readRepoFile(".github/prompts/rubrics-update.md");
    for (const workflow of [implementWorkflow, fixPrWorkflow, reviewWorkflow, rubricsReviewWorkflow]) {
        node_assert_1.strict.doesNotMatch(workflow, /rubrics_mode_override:\s*'read-only'/);
        node_assert_1.strict.match(workflow, /rubrics_policy:\s*\$\{\{\s*vars\.AGENT_RUBRICS_POLICY \|\| ''\s*\}\}/);
    }
    node_assert_1.strict.match(rubricsInitializationWorkflow, /rubrics_mode_override:\s*'enabled'/);
    node_assert_1.strict.match(rubricsUpdateWorkflow, /rubrics_mode_override:\s*'enabled'/);
    node_assert_1.strict.match(rubricsInitializationPrompt, /gh repo view \$\{REPO_SLUG\} --json owner,nameWithOwner/);
    node_assert_1.strict.match(rubricsInitializationPrompt, /permissions\.admin or \.permissions\.maintain/);
    node_assert_1.strict.match(rubricsInitializationPrompt, /primary source of user\/team preference/);
    node_assert_1.strict.match(rubricsUpdatePrompt, /author's login,[\s\S]*user type,[\s\S]*author_association/);
    node_assert_1.strict.match(rubricsUpdatePrompt, /gh repo view \$\{REPO_SLUG\} --json owner,nameWithOwner/);
    node_assert_1.strict.match(rubricsUpdatePrompt, /permissions\.admin or \.permissions\.maintain/);
    node_assert_1.strict.match(rubricsUpdatePrompt, /non-primary maintainer comments as corroborating evidence/);
    node_assert_1.strict.match(rubricsUpdatePrompt, /automatic merged-PR rubrics-update runs[\s\S]*closed\/merged/);
    node_assert_1.strict.match(rubricsUpdatePrompt, /authored by `REQUESTED_BY`; it does not make other PR conversation[\s\S]*participants trusted/);
    node_assert_1.strict.match(rubricsUpdateWorkflow, /issues:\s*write/);
    node_assert_1.strict.match(rubricsUpdateWorkflow, /id:\s*rubrics_update/);
    node_assert_1.strict.match(rubricsUpdateWorkflow, /Prepare rubrics update summary/);
    node_assert_1.strict.match(rubricsUpdateWorkflow, /prepare-rubrics-update-summary\.js/);
    node_assert_1.strict.match(rubricsUpdateWorkflow, /Post rubrics update summary/);
});
(0, node_test_1.test)("rubrics-review prompt chooses from full active rubric context", () => {
    const rubricsReviewPrompt = readRepoFile(".github/prompts/rubrics-review.md");
    node_assert_1.strict.match(rubricsReviewPrompt, /full active rubric set/);
    node_assert_1.strict.match(rubricsReviewPrompt, /do not score unrelated route\/process rubrics/);
});
(0, node_test_1.test)("memory workflows exist and point at the right CLIs / prompts", () => {
    const bootstrapWorkflow = readRepoFile(".github/workflows/agent-memory-bootstrap.yml");
    const syncWorkflow = readRepoFile(".github/workflows/agent-memory-sync.yml");
    const prClosedWorkflow = readRepoFile(".github/workflows/agent-memory-pr-closed.yml");
    const scanWorkflow = readRepoFile(".github/workflows/agent-memory-scan.yml");
    node_assert_1.strict.match(bootstrapWorkflow, /^name: Agent \/ Memory \/ Initialization$/m);
    node_assert_1.strict.match(syncWorkflow, /^name: Agent \/ Memory \/ Sync GitHub Artifacts$/m);
    node_assert_1.strict.match(prClosedWorkflow, /^name: Agent \/ Memory \/ Record PR Closure$/m);
    node_assert_1.strict.match(scanWorkflow, /^name: Agent \/ Memory \/ Curate Recent Activity$/m);
    node_assert_1.strict.match(bootstrapWorkflow, /workflow_dispatch:/);
    node_assert_1.strict.match(bootstrapWorkflow, /inputs:\s*[\s\S]*memory_ref:/);
    node_assert_1.strict.match(bootstrapWorkflow, /git\/matching-refs\/heads\/\$\{MEMORY_REF\}/);
    node_assert_1.strict.match(bootstrapWorkflow, /exact_ref="refs\/heads\/\$\{MEMORY_REF\}"/);
    node_assert_1.strict.match(bootstrapWorkflow, /grep -Fxq "\$exact_ref"/);
    node_assert_1.strict.match(bootstrapWorkflow, /already exists\. Bootstrap is first-run only\./);
    node_assert_1.strict.match(bootstrapWorkflow, /uses: \.\/\.github\/actions\/download-agent-memory/);
    node_assert_1.strict.match(bootstrapWorkflow, /bootstrap_if_missing: "true"/);
    node_assert_1.strict.match(bootstrapWorkflow, /Resolve memory bootstrap provider/);
    node_assert_1.strict.match(bootstrapWorkflow, /install_codex:\s*\$\{\{\s*steps\.provider\.outputs\.install_codex\s*\}\}/);
    node_assert_1.strict.match(bootstrapWorkflow, /install_claude:\s*\$\{\{\s*steps\.provider\.outputs\.install_claude\s*\}\}/);
    node_assert_1.strict.match(bootstrapWorkflow, /node \.agent\/dist\/cli\/memory\/read-sync-state\.js/);
    node_assert_1.strict.match(bootstrapWorkflow, /node \.agent\/dist\/cli\/memory\/sync-github-artifacts\.js/);
    node_assert_1.strict.match(bootstrapWorkflow, /node \.agent\/dist\/cli\/memory\/write-sync-state\.js/);
    node_assert_1.strict.match(bootstrapWorkflow, /PREVIOUS_LAST_SYNC: ""/);
    node_assert_1.strict.doesNotMatch(bootstrapWorkflow, /steps\.commit\.outputs\.committed == 'true'/);
    node_assert_1.strict.match(bootstrapWorkflow, /steps\.memory\.outputs\.memory_available == 'true'/);
    node_assert_1.strict.match(bootstrapWorkflow, /node \$\{\{ github\.workspace \}\}\/\.agent\/dist\/cli\/commit\.js/);
    node_assert_1.strict.match(bootstrapWorkflow, /COMMIT_CWD:\s*\$\{\{\s*runner\.temp\s*\}\}\/agent-memory/);
    node_assert_1.strict.doesNotMatch(bootstrapWorkflow, /GITHUB_WORKSPACE:\s*\$\{\{\s*runner\.temp\s*\}\}\/agent-memory/);
    node_assert_1.strict.match(bootstrapWorkflow, /COMMIT_MESSAGE: "chore\(memory\): initialize memory branch"/);
    node_assert_1.strict.match(bootstrapWorkflow, /COMMIT_MESSAGE: "chore\(memory\): sync github artifacts"/);
    node_assert_1.strict.match(bootstrapWorkflow, /permission_mode: approve-all/);
    node_assert_1.strict.match(bootstrapWorkflow, /prompt: memory-scan/);
    node_assert_1.strict.match(bootstrapWorkflow, /memory_mode_override: 'enabled'/);
    node_assert_1.strict.match(bootstrapWorkflow, /memory_policy:\s*\$\{\{\s*vars\.AGENT_MEMORY_POLICY \|\| ''\s*\}\}/);
    node_assert_1.strict.match(bootstrapWorkflow, /workflow: agent-memory-bootstrap\.yml/);
    node_assert_1.strict.match(bootstrapWorkflow, /inputs\.memory_ref \|\| vars\.AGENT_MEMORY_REF \|\| 'agent\/memory'/);
    node_assert_1.strict.doesNotMatch(bootstrapWorkflow, /dispatch-workflow\.js/);
    node_assert_1.strict.match(syncWorkflow, /cron: "17 \*\/6 \* \* \*"/);
    node_assert_1.strict.match(syncWorkflow, /node \.agent\/dist\/cli\/memory\/read-sync-state\.js/);
    node_assert_1.strict.match(syncWorkflow, /node \.agent\/dist\/cli\/memory\/sync-github-artifacts\.js/);
    node_assert_1.strict.match(syncWorkflow, /node \.agent\/dist\/cli\/memory\/write-sync-state\.js/);
    node_assert_1.strict.match(syncWorkflow, /inputs\.memory_ref \|\| vars\.AGENT_MEMORY_REF \|\| 'agent\/memory'/);
    node_assert_1.strict.match(syncWorkflow, /GH_TOKEN:\s*\$\{\{\s*steps\.auth\.outputs\.token\s*\}\}/);
    node_assert_1.strict.match(syncWorkflow, /GITHUB_TOKEN:\s*\$\{\{\s*steps\.auth\.outputs\.token\s*\}\}/);
    node_assert_1.strict.match(syncWorkflow, /MEMORY_SYNC_LOOKBACK_DAYS:\s*\$\{\{\s*inputs\.lookback_days \|\| '30'\s*\}\}/);
    node_assert_1.strict.match(syncWorkflow, /bootstrap_if_missing: "true"/);
    node_assert_1.strict.match(syncWorkflow, /COMMIT_CWD:\s*\$\{\{\s*runner\.temp\s*\}\}\/agent-memory/);
    node_assert_1.strict.doesNotMatch(syncWorkflow, /GITHUB_WORKSPACE:\s*\$\{\{\s*runner\.temp\s*\}\}\/agent-memory/);
    node_assert_1.strict.doesNotMatch(syncWorkflow, /dispatch_scan_on_success:/);
    node_assert_1.strict.doesNotMatch(syncWorkflow, /dispatch-workflow\.js/);
    node_assert_1.strict.doesNotMatch(syncWorkflow, /Bootstrap memory checkout/);
    node_assert_1.strict.doesNotMatch(syncWorkflow, /date -u -d/);
    // The dedicated memory scaffolds bypass the memory policy so they always run.
    node_assert_1.strict.match(prClosedWorkflow, /pull_request_target:\s*[\s\S]*types: \[closed\]/);
    node_assert_1.strict.match(prClosedWorkflow, /permission_mode: approve-all/);
    node_assert_1.strict.match(prClosedWorkflow, /prompt: memory-pr-closed/);
    node_assert_1.strict.match(prClosedWorkflow, /memory_mode_override: 'enabled'/);
    node_assert_1.strict.match(prClosedWorkflow, /memory_policy:\s*\$\{\{\s*vars\.AGENT_MEMORY_POLICY \|\| ''\s*\}\}/);
    node_assert_1.strict.doesNotMatch(prClosedWorkflow, /memory_bootstrap_if_missing:/);
    node_assert_1.strict.match(prClosedWorkflow, /inputs\.memory_ref \|\| vars\.AGENT_MEMORY_REF \|\| 'agent\/memory'/);
    node_assert_1.strict.doesNotMatch(prClosedWorkflow, /continue-on-error:\s*true/);
    // Fork safety: either same repo, workflow_dispatch, or merged fork PR.
    node_assert_1.strict.match(prClosedWorkflow, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
    node_assert_1.strict.match(prClosedWorkflow, /github\.event\.pull_request\.merged == true/);
    node_assert_1.strict.match(scanWorkflow, /cron: '0 \*\/6 \* \* \*'/);
    node_assert_1.strict.match(scanWorkflow, /permission_mode: approve-all/);
    node_assert_1.strict.match(scanWorkflow, /prompt: memory-scan/);
    node_assert_1.strict.match(scanWorkflow, /memory_mode_override: 'enabled'/);
    node_assert_1.strict.match(scanWorkflow, /memory_policy:\s*\$\{\{\s*vars\.AGENT_MEMORY_POLICY \|\| ''\s*\}\}/);
    node_assert_1.strict.doesNotMatch(scanWorkflow, /memory_bootstrap_if_missing:/);
    node_assert_1.strict.match(scanWorkflow, /inputs\.memory_ref \|\| vars\.AGENT_MEMORY_REF \|\| 'agent\/memory'/);
    node_assert_1.strict.match(scanWorkflow, /target_kind: repository/);
    node_assert_1.strict.doesNotMatch(scanWorkflow, /continue-on-error:\s*true/);
});
(0, node_test_1.test)("download-agent-memory only suppresses missing-branch failures", () => {
    const action = readRepoFile(".github/actions/download-agent-memory/action.yml");
    node_assert_1.strict.match(action, /bootstrap_if_missing:/);
    node_assert_1.strict.match(action, /git clone --depth=1 --branch "\$ref" --single-branch "\$auth_url" "\$dest"/);
    node_assert_1.strict.match(action, /if git ls-remote --exit-code --heads "\$auth_url" "\$ref"[\s\S]*else[\s\S]*lsremote_status=\$\?[\s\S]*fi/);
    node_assert_1.strict.match(action, /if \[ "\$lsremote_status" -eq 2 \]/);
    node_assert_1.strict.match(action, /if \[ "\$INPUT_BOOTSTRAP_IF_MISSING" = "true" \]/);
    node_assert_1.strict.match(action, /memory\/init\.js/);
    node_assert_1.strict.match(action, /Failed to clone memory branch/);
});
(0, node_test_1.test)("main execution workflows rely on the default memory policy (no explicit override)", () => {
    const routerWorkflow = readRepoFile(".github/workflows/agent-router.yml");
    const implementWorkflow = readRepoFile(".github/workflows/agent-implement.yml");
    const fixPrWorkflow = readRepoFile(".github/workflows/agent-fix-pr.yml");
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    // No explicit memory_enabled flag — memory is on by default via policy.
    node_assert_1.strict.doesNotMatch(routerWorkflow, /memory_enabled:/);
    node_assert_1.strict.doesNotMatch(implementWorkflow, /memory_enabled:/);
    node_assert_1.strict.doesNotMatch(fixPrWorkflow, /memory_enabled:/);
    node_assert_1.strict.match(routerWorkflow, /memory_ref:\s*\$\{\{\s*vars\.AGENT_MEMORY_REF \|\| 'agent\/memory'\s*\}\}/);
    node_assert_1.strict.match(implementWorkflow, /memory_ref:\s*\$\{\{\s*vars\.AGENT_MEMORY_REF \|\| 'agent\/memory'\s*\}\}/);
    node_assert_1.strict.match(fixPrWorkflow, /memory_ref:\s*\$\{\{\s*vars\.AGENT_MEMORY_REF \|\| 'agent\/memory'\s*\}\}/);
    node_assert_1.strict.match(routerWorkflow, /memory_policy:\s*\$\{\{\s*vars\.AGENT_MEMORY_POLICY \|\| ''\s*\}\}/);
    node_assert_1.strict.match(implementWorkflow, /memory_policy:\s*\$\{\{\s*vars\.AGENT_MEMORY_POLICY \|\| ''\s*\}\}/);
    node_assert_1.strict.match(fixPrWorkflow, /memory_policy:\s*\$\{\{\s*vars\.AGENT_MEMORY_POLICY \|\| ''\s*\}\}/);
    // Review matrix is explicitly read-only so the parallel claude+codex jobs
    // don't race to push to agent/memory; synthesize (no override) inherits
    // the default mode and writes.
    node_assert_1.strict.match(reviewWorkflow, /memory_mode_override: 'read-only'/);
    node_assert_1.strict.match(reviewWorkflow, /memory_ref:\s*\$\{\{\s*vars\.AGENT_MEMORY_REF \|\| 'agent\/memory'\s*\}\}/);
    node_assert_1.strict.match(reviewWorkflow, /memory_policy:\s*\$\{\{\s*vars\.AGENT_MEMORY_POLICY \|\| ''\s*\}\}/);
});
(0, node_test_1.test)("agent-review permissions are scoped per-job: reviewers read-only, synthesize writes", () => {
    const reviewWorkflow = readRepoFile(".github/workflows/agent-review.yml");
    // Top-level workflow permissions keep contents read-only; actions write
    // allows the synthesize job to dispatch automation handoffs.
    node_assert_1.strict.match(reviewWorkflow, /^permissions:\s*\n\s+actions: write\s*\n\s+contents: read/m);
    // Reviewer job keeps contents:read.
    node_assert_1.strict.match(reviewWorkflow, /review:\s*\n\s+# Reviewer lanes are best-effort[\s\S]*?permissions:\s*\n\s+# Reviewer jobs stay read-only[\s\S]*?contents: read/);
    // Synthesize job upgrades to contents:write for the memory commit.
    node_assert_1.strict.match(reviewWorkflow, /synthesize:\s*\n\s+needs: \[review\]\s*\n\s+if: \$\{\{ !cancelled\(\) \}\}\s*\n\s+permissions:[\s\S]*?contents: write/);
});
(0, node_test_1.test)("branch cleanup preserves shared agent branches", () => {
    const cleanup = readRepoFile(".github/workflows/agent-branch-cleanup.yml");
    node_assert_1.strict.match(cleanup, /head\.ref != \(vars\.AGENT_MEMORY_REF \|\| 'agent\/memory'\)/);
    node_assert_1.strict.match(cleanup, /head\.ref != \(vars\.AGENT_RUBRICS_REF \|\| 'agent\/rubrics'\)/);
});
(0, node_test_1.test)("memory and rubric guidance live in dedicated conditional prompt fragments", () => {
    const base = readRepoFile(".github/prompts/_base.md");
    const memory = readRepoFile(".github/prompts/_memory.md");
    const rubrics = readRepoFile(".github/prompts/_rubrics.md");
    const runSource = readRepoFile(".agent/src/run.ts");
    node_assert_1.strict.doesNotMatch(base, /Repository memory/);
    node_assert_1.strict.doesNotMatch(base, /memory\/search\.js/);
    node_assert_1.strict.doesNotMatch(base, /memory\/update\.js/);
    node_assert_1.strict.doesNotMatch(base, /MEMORY_AVAILABLE/);
    node_assert_1.strict.match(memory, /Repository memory/);
    node_assert_1.strict.match(memory, /memory\/search\.js/);
    node_assert_1.strict.match(memory, /memory\/update\.js/);
    node_assert_1.strict.match(memory, /\$\{MEMORY_DIR\}/);
    node_assert_1.strict.match(runSource, /MEMORY_PROMPT_PATH = "\.github\/prompts\/_memory\.md"/);
    node_assert_1.strict.match(runSource, /vars\.MEMORY_AVAILABLE === "true"/);
    node_assert_1.strict.match(rubrics, /User\/team rubrics/);
    node_assert_1.strict.match(rubrics, /\$\{RUBRICS_CONTEXT\}/);
    node_assert_1.strict.match(runSource, /RUBRICS_PROMPT_PATH = "\.github\/prompts\/_rubrics\.md"/);
    node_assert_1.strict.match(runSource, /vars\.RUBRICS_AVAILABLE === "true"/);
    node_assert_1.strict.match(runSource, /base \+ memory \+ rubrics \+ template/);
});
//# sourceMappingURL=envelope.test.js.map