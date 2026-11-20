---
name: graph-problem-solver
description: "Use when the user wants a complex decision, project or automation idea turned into a node-and-dependency graph. Produces or updates Graph JSON (facts, decisions, tasks, risks and the links between them). Not for simple planning or ordinary diagrams."
---

# Solving problems with a graph

Make a complex problem visible as links between facts, decisions, tasks and risks. First extract the user's goal, the data they already have and the uncertainties from the current conversation. If missing information would change the basic shape of the graph, ask one short question; otherwise state your assumption and go on.

## Output

When the user asks for a graph, reply with a valid `json` code block in the chat. This schema is the starting point for working with the user's graph app (for example Nodewright):

```json
{
  "nodes": [
    { "id": "F1", "label": "Verified fact", "type": "fact", "x": 100, "y": 100 },
    { "id": "D1", "label": "Decision to make", "type": "decision", "x": 380, "y": 100 },
    { "id": "T1", "label": "Next task", "type": "task", "x": 660, "y": 100 },
    { "id": "R1", "label": "Important risk", "type": "risk", "x": 660, "y": 260 }
  ],
  "edges": [
    { "from": "F1", "to": "D1" },
    { "from": "D1", "to": "T1" },
    { "from": "D1", "to": "R1" }
  ]
}
```

Keep `id` values unique and make sure both ends of every edge point to an existing node. Choose `type` from `fact`, `decision`, `task` or `risk`. Use more nodes and links for bigger problems; do not add nodes just to fill the template.

Never mix verified information with assumptions. State assumptions in a short explanation, or show them as decision nodes to be confirmed with the user. If the import schema of the user's graph app differs, follow the schema the app gives you. Do not assume the name of the app or its buttons unless the current conversation confirms them.

After the JSON, briefly explain the most important decisions, dependencies and risks. If the user asks for JSON only, add no explanation.

## Continuing the graph

If the user adds data to nodes in the app and sends the graph back, match the new data against the existing graph and explain the changed assumptions, the bottlenecks and the next decision. If the user is not using an app, review and update the graph in the chat. If a code or automation app is requested separately, build it with the available tools, within the authority and project limits the user gives you.
