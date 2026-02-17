// Node: コード実行
// Workflow: テストワークフロー

const items = $input.all();
return items.map(item => ({
  json: { processed: true, original: item.json }
}));
