let contextualParallel;
export default function annotateAlgorithm(algo, algoUrls) {
  contextualParallel = undefined;
  const annotatedAlgo = structuredClone(algo);
  annotateSubAlgo(annotatedAlgo, new Set(algoUrls));
  return annotatedAlgo;
}

function annotateSubAlgo(a, algoUrls, thread = "main", level = 0) {
  if (level === 0 || level < contextualParallel) {
    contextualParallel = undefined;
  }
  let embedParallel = false;
  let remainingParallel = false;
  a.thread = thread;
  a.types = [];
  if (a.html) {
    const intro = document.createElement("div");
    intro.innerHTML = a.html;
    const linkUrls = new Set([...intro.querySelectorAll("a[href]")].map(n => n.href));
    let text = intro.textContent.toLowerCase().trim();
    const m = text.match(/^([a-z]+): (.*)$/);
    if (m && m[1] !== "assert") {
      text = m[2];
      a.label = m[1];
    }

    remainingParallel = (text.includes("remaining steps") || text.includes("remainder") || text.includes("continue running")) && text.includes("in parallel") && (level > 0 || (level === 0 && !text.includes(" synchronous")));
    if (remainingParallel) {
      contextualParallel = level;
    }
    embedParallel = !remainingParallel && text.includes("in parallel");
    if (embedParallel || contextualParallel >= level) {
      thread = "parallel";
    }

    if ((level === 0 && text.includes(" synchronous")) || text.startsWith("⌛")) {
      thread = "main";
    }
    if ((text.includes("queue") && text.includes("task")) || text.includes("await a stable state")) {
      thread = "queued";
    }

    if (level > 0 && text.startsWith("assert:")) {
      a.types.push("assert");
    }
    if (level > 0 && (text.startsWith("let") || text.includes(". let"))) {
      a.types.push("init");
    }
    if (level > 0 && (text.startsWith("if") || text.startsWith("otherwise") || text.startsWith("while"))) {
      a.types.push("condition");
    }
    if (level > 0 && (text.includes("jump") && text.includes("step") || text.includes("break"))) {
      a.types.push("jump");
    }
    if ((level > 0 || !a.steps) && algoUrls.intersection(linkUrls).size > 0) {
      a.types.push("invoke");
    }
    if ((level > 0 || !a.steps) && (text.includes("return ") || text.includes("return."))) {
      a.types.push("return");
    }
  }
  for (const step of a.steps ?? []) {
    step.thread = thread;
    annotateSubAlgo(step, algoUrls, thread, level + 1);
  }
}
