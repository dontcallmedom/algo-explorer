import assert from 'node:assert';
import test from 'node:test';

import { JSDOM } from 'jsdom';

global.document = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`).window.document;

import annotateAlgorithm from "../lib/annotate-algo.mjs";

function composeInputOutput(input, output) {
  const ret = Object.assign(structuredClone(input), output);
  for (const i in ret.steps || []) {
    ret.steps[i] = composeInputOutput(input.steps[i], output.steps[i]);
  }
  return ret;
}

const tests = [
  {
    name: "single step single thread algorithm gets annotated with thread and return",
    algo: {
      html: "To <dfn>do something</dfn>, return an action"
    },
    output: {
      thread: "main",
      types: ["return"]
    }
  },
  {
    name: "multiple steps single thread algorithm gets annotated",
    urls: ["about:blank#worth"],
    algo: {
      html: "To <dfn>do something</dfn>, run the following steps:",
      steps: [
	{
	  html: "Let X be something worth doing"
	},
	{
	  html: "Assert: X is <a href='#worth'>worth doing</a>"
	},
	{
	  html: "If not done, do it"
	},
	{
	  html: "Otherwise, jump to step labeled <em>end</em>"
	},
	{
	  html: "End: Return X"
	}
      ]
    },
    output: {
      thread: "main",
      types: [],
      steps: [
	{
	  thread: "main",
	  types: ["init"]
	},
	{
	  thread: "main",
	  types: ["assert", "invoke"]
	},
	{
	  thread: "main",
	  types: ["condition"]
	},
	{
	  thread: "main",
	  types: ["condition", "jump"]
	},
	{
	  thread: "main",
	  label: "end",
	  types: ["return"]
	}
      ]
    }
  },
  {
    name: "multiple steps multi thread algorithm gets annotated",
    algo: {
      html: "To <dfn>do something</dfn>, run the following steps in parallel:",
      steps: [
	{
	  html: "Let X be something worth doing"
	},
	{
	  html: "Queue a task to display X"
	}
      ]
    },
    output: {
      thread: "main",
      types: [],
      steps: [
	{
	  thread: "parallel",
	  types: ["init"]
	},
	{
	  thread: "parallel",
	  types: []
	}
      ]
    }
  },
  {
    name: "multiple steps multi thread  and queued algorithm gets annotated",
    algo: {
      html: "To <dfn>promise to do something</dfn>, run the following steps in parallel:",
      steps: [
	{
	  html: "Let X be something worth doing"
	},
	{
	  html: "Queue a task to run the following steps:",
	  steps: [
	    {
	      "html": "Resolve p with X"
	    }
	  ]
	}
      ]
    },
    output: {
      thread: "main",
      types: [],
      steps: [
	{
	  thread: "parallel",
	  types: ["init"]
	},
	{
	  thread: "parallel",
	  types: [],
	  steps: [
	    {
	      "types": [],
	      "thread": "queued"
	    }
	  ]
	}
      ]
    }
  }

];

for (const desc of tests) {
  test(desc.name, t => {
    assert.deepStrictEqual(annotateAlgorithm(desc.algo, desc.urls || []),
			   composeInputOutput(desc.algo, desc.output));
  });
}
