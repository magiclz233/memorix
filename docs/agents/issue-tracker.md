# Issue tracker: GitHub

此仓库的规格与开发任务使用 GitHub Issues 管理。使用 `gh` CLI 在 `magiclz233/memorix` 中读取和创建 issue。

## Conventions

- 创建：`gh issue create --title "..." --body "..."`
- 查看：`gh issue view <number> --comments`
- 列表：`gh issue list --state open`
- 更新标签：`gh issue edit <number> --add-label "..."`
- 关闭：`gh issue close <number> --comment "..."`

Pull request 不是 triage 输入面。技能要求“发布到 issue tracker”时，应创建 GitHub issue。
