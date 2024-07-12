import annotateAlgorithm from "./lib/annotate-algo.mjs";

const specSelector = document.getElementById("spec");
const algos = document.getElementById("algos");

const webrefBase = "https://w3c.github.io/webref/ed/";

const { results } = await (await fetch(webrefBase + "index.json")).json();
// TODO: set up GH action to update regularly list of algorithms URLs
// jq -s '[.[].algorithms[]|.href]' webref/ed/algorithms/*.json > algo-urls.json
const algoUrls = new Set(await (await fetch("./algo-urls.json")).json());

specSelector.addEventListener("change", showSpec);

results.sort((a,b) => a.title.localeCompare(b.title)).forEach(s => {
  if (s.algorithms) {
    const opt = document.createElement("option");
    opt.dataset.spec = s.shortname;
    opt.value = s.algorithms;
    opt.textContent = s.title;
    specSelector.append(opt);
  }
});

const typeToSymbol = type => {
  switch(type) {
  case "init":
    return "⬡";
    break;
  case "condition":
    return "◇";
    break;
  case "jump":
    return "⏩";
    break;
  case "invoke":
    return "▥";
    break;
  case "assert":
    return "✅";
    break;
  case "return":
    return "⏎";
    break;
  }
};

const m = window.location.search.match(/\?s=(.+)$/);
if (m) {
  const spec = m[1];
  specSelector.value = specSelector.querySelector(`option[data-spec="${spec}"]`)?.value;
  specSelector.dispatchEvent(new Event("change"));
}

let contextualParallel;
function showAlgo(a, substep = false) {
  const ret = [];
  if (!substep) {
    const heading = document.createElement("h2");
    if (a.name) {
      if (a.href) {
	const link = document.createElement("a");
	link.textContent = a.name;
	link.href = a.href;
	heading.append(link);
      } else {
	heading.textContent = a.name;
      }
    } else {
    heading.textContent = "(unnamed algorithm)";
    }
    ret.push(heading);
  }
  if (a.html) {
    const intro = document.createElement("div");
    intro.innerHTML = a.html;

    (a.types?.toReversed() || []).forEach(type => {
      const span = document.createElement("span");
      span.className = type;
      span.classList.add("step-type");
      span.textContent = typeToSymbol(type);
      intro.prepend(span);
    });
    ret.push(intro);
  }
  if (a.steps) {
    const container = document.createElement(a.operation === "switch" ? "dl" : "ol");
    for (const step of a.steps) {
      if (step.case) {
	const dt = document.createElement("dt");
	dt.innerHTML = step.case;
	const dd = document.createElement("dd");
	dd.append(...showAlgo(step, true));
	dd.classList.add(step.thread);
	dt.className = step.thread;
	const span = document.createElement("span");
	span.className = "condition";
	span.textContent = "◇";
	dt.prepend(span);
	container.append(dt, dd);
      } else {
	const li = document.createElement("li");
	li.className = step.thread;
	li.append(...showAlgo(step, true));
	container.append(li);
      }
    }
    ret.push(container);
  }
  const additional = a.additional;
  if (additional) {
    const div = document.createElement("div");
    div.className = "additional";
    div.append("Additional:", ...additional.map(aa => showAlgo(aa, true)).flat());
    ret.push(div);
  }
  if (a.ignored) {
    const div = document.createElement("div");
    div.className = "ignored";
    div.textContent = "Ignored: " + a.ignored;
    ret.push(div);
  }
  return ret;
}

async function showSpec(e) {

  const specShortname = specSelector.children[specSelector.selectedIndex].dataset.spec;
  history.pushState({}, "", "?s=" + specShortname);
  const { algorithms } = await (await fetch(webrefBase + e.target.value)).json();
  algos.innerHTML = "";
  for (const a of algorithms) {
    const annotatedAlgo = annotateAlgorithm(a, algoUrls);;
    const section = document.createElement("section");
    section.append(...showAlgo(annotatedAlgo));
    algos.append(section);
  }
}
