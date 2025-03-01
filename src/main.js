import "normalize.css";
import "./styles/spinner.css";
import "./styles/toggle.css";
import "./styles/main.css";

import { instance } from "@viz-js/viz";
import Graph from "./scripts/graph";
import RawGraph from "./scripts/rawGraph";
import templates from "./data/templates.json";

const graphElem = document.getElementById("graph");
const graphTitleElem = document.getElementById("graph-title");
const inputElem = document.getElementById("input");
const uploadElem = document.getElementById("upload");
const saveElem = document.getElementById("save");
const simplifyElem = document.getElementById("simplify");
const dfaElem = document.getElementById("dfa");
const wordsElem = document.getElementById("wordList");
const allWordsElem = document.getElementById("wordListAll");
const selectTemplateElem = document.getElementById("selectTemplate");
const infoDfaElem = document.getElementById("infoDfa");
const infoFiniteElem = document.getElementById("infoFinite");
const inputTestElem = document.getElementById("inputTest");
const inputTestIconElem = document.getElementById("inputTestIcon");
const toggleGroupElem = document.getElementById("toggleGroup");
const testsElem = document.getElementById("tests");

inputTestElem.value = localStorage.getItem("word");
simplifyElem.checked = localStorage.getItem("simplify") === "true";
dfaElem.checked = localStorage.getItem("dfa") === "true";
const storedRawGraph = localStorage.getItem("rawGraph");
if (storedRawGraph) inputElem.value = storedRawGraph;
if (!inputElem.value) inputElem.value = templates.Wooow;
selectTemplateElem.innerHTML = Object.keys(templates).reduce(
  (total, templateName) =>
    `${total}<option value="${templateName}">${templateName}</option>`,
  '<option value="" selected disabled style="display: none;" id="selectTemplatePlaceholder">Custom input</option>'
);
const selectTemplatePlaceholderElem = document.getElementById(
  "selectTemplatePlaceholder"
);

let data;
let graph = {
  simplified: undefined,
  original: undefined,
  dfa: undefined,
  pda: undefined,
};
let graphSvg = {
  simplified: undefined,
  original: undefined,
  dfa: undefined,
  pda: undefined,
};

let testStringRemovePattern = /\W+/g;

function saveState() {
  if (inputElem.value.length < 5000)
    localStorage.setItem("rawGraph", inputElem.value);
  localStorage.setItem("dfa", dfaElem.checked);
  localStorage.setItem("simplify", simplifyElem.checked);
  localStorage.setItem("word", inputTestElem.value);
}

function getGraphType() {
  if (graph.original && graph.original.isPda) return "pda";
  if (dfaElem.checked) return "dfa";
  if (simplifyElem.checked) return "simplified";
  return "original";
}

async function testCustomWord() {
  let type = getGraphType();
  if (type === "original") type = "simplified";

  const word = inputTestElem.value.replace(testStringRemovePattern, "");

  inputTestElem.value = word;

  if (inputTestElem.checkValidity()) {
    inputTestIconElem.dataset.icon = graph[type].isAcceptedString(word)
      ? "true"
      : "false";
  } else {
    inputTestIconElem.dataset.icon = "undefined";
  }

  saveState();
}

async function testDfa() {
  const type = getGraphType();

  infoDfaElem.classList.remove(
    "info__icon-container--false",
    "info__icon-container--true",
    "info__icon-container--undefined",
    "info__icon-container--unknown",
    "info__icon-container--warning"
  );
  let result = graph[type].isDfa ? "true" : "false";
  if (graph[type].isDfa === undefined) result = "undefined";
  if (graph[type].isPda) result = "unknown";

  infoDfaElem.classList.add(`info__icon-container--${result}`);
  if (
    data.dfa !== undefined &&
    data.dfa !== graph[type].isDfa &&
    !graph[type].isPda
  )
    infoDfaElem.classList.add("info__icon-container--warning");
}

async function testFinite() {
  let type = getGraphType();
  if (type === "original") type = "simplified";

  infoFiniteElem.classList.remove(
    "info__icon-container--false",
    "info__icon-container--true",
    "info__icon-container--undefined",
    "info__icon-container--unknown",
    "info__icon-container--warning"
  );

  let result = graph[type].isFinite ? "true" : "false";
  if (graph[type].isFinite === undefined) result = "warning";
  if (graph[type].isPda) result = "unknown";

  infoFiniteElem.classList.add(`info__icon-container--${result}`);
  if (
    data.finite !== undefined &&
    data.finite !== graph[type].isFinite &&
    !graph[type].isPda
  )
    infoFiniteElem.classList.add("info__icon-container--warning");
}

async function testWords() {
  let type = getGraphType();
  if (type === "original") type = "simplified";

  wordsElem.innerHTML = data.words.reduce(
    (total, word) =>
      `${total}<li class="word-list__item" data-icon="${graph[type].isAcceptedString(word.word)}" data-original="${word.accepted}"><span class="word-list__word">${word.word !== "" ? word.word : "&nbsp;"}</span></li>`,
    ""
  );
}

async function displayAllAcceptedStrings() {
  let type = getGraphType();
  if (type === "original") type = "simplified";

  allWordsElem.innerHTML = graph[type].acceptedStrings.reduce(
    (total, word) =>
      `${total}<li class="word-list__item" data-icon="true"><span class="word-list__word">${word !== "" ? word : "&nbsp;"}</span></li>`,
    ""
  );
  allWordsElem.dataset.infinite = !graph[type].isFinite;
}

async function displayGraph() {
  const type = getGraphType();

  saveElem.setAttribute(
    "href",
    `data:text/plain;charset=utf-8,${encodeURIComponent(graph[type].toRawText())}`
  );
  saveElem.setAttribute("download", `${graph[type].title}-${type}.txt`);

  graphTitleElem.textContent = `${graph[type].title || ""} (${type})`;

  if (graphSvg[type]) {
    graphElem.innerHTML = "";
    graphElem.appendChild(graphSvg[type]);
  } else {
    graphElem.innerHTML = '<div class="hexdots-loader"> </div>';
    instance().then((viz) => {
      let element;
      try {
        element = viz.renderSVGElement(graph[type].toDotFormat());
      } catch (error) {
        element = viz.renderSVGElement(
          'digraph "Graph" { "Graph too big,\nskiping drawing" [shape="plaintext" width=3];}'
        );
      }
      graphElem.innerHTML = "";
      graphElem.appendChild(element);
      graphSvg[type] = element;
    });
  }

  testDfa();
  testFinite();

  testWords();
  testCustomWord();

  displayAllAcceptedStrings();

  saveState();
}

async function readData() {
  const newData = new RawGraph(inputElem.value);
  if (JSON.stringify(data) !== JSON.stringify(newData)) {
    data = newData;

    if (data.stack.length > 0) {
      dfaElem.checked = false;
      simplifyElem.checked = false;

      dfaElem.disabled = true;
      simplifyElem.disabled = true;

      toggleGroupElem.classList.add("toggle-group__faded");
      testsElem.classList.add("noAllWords");
    } else {
      dfaElem.disabled = false;
      simplifyElem.disabled = false;

      toggleGroupElem.classList.remove("toggle-group__faded");
      testsElem.classList.remove("noAllWords");
    }

    graph = {
      simplified:
        data.stack.length === 0 ? new Graph(data, "simplified") : undefined,
      original: new Graph(data, "original"),
      dfa:
        dfaElem.checked && data.stack.length === 0
          ? new Graph(data, "dfa")
          : undefined,
      pda: new Graph(data, "original"),
    };
    graphSvg = {
      simplified: undefined,
      original: undefined,
      dfa: undefined,
      pda: undefined,
    };

    const type = getGraphType();

    inputTestElem.pattern = `^[${[...graph[type].alphabet].join("")}]*$`;
    testStringRemovePattern = new RegExp(
      `[^${[...graph[type].alphabet].join("")}]+`,
      "g"
    );

    displayGraph();
  }
}

async function readFileAsString() {
  const { files } = this;
  if (files.length >= 0) {
    const reader = new FileReader();
    reader.onload = (event) => {
      inputElem.value = event.target.result;
      readData();
      uploadElem.value = null;
    };
    reader.readAsText(files[0]);
    selectTemplatePlaceholderElem.textContent = files[0].name;
    selectTemplatePlaceholderElem.selected = true;
  }
}

async function openTemplate() {
  if (selectTemplateElem.value) {
    inputElem.value = templates[selectTemplateElem.value];
    readData();
  }
}

readData();

inputElem.addEventListener("input", readData);
uploadElem.addEventListener("change", readFileAsString);
selectTemplateElem.addEventListener("change", openTemplate);
inputTestElem.addEventListener("input", testCustomWord);
simplifyElem.addEventListener("input", displayGraph);
dfaElem.addEventListener("input", () => {
  if (dfaElem.checked && !graph.dfa) graph.dfa = new Graph(data, "dfa");

  displayGraph();
});
