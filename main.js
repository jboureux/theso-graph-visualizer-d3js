import { Graph } from "./graph_generator";
const lang = "fr";

var handleResize;

document.querySelector("#show-data").addEventListener("click", (event) => {
    const input = document.querySelector("#data-url");
    if (input.value == "" || input.value == undefined) {
        alert("Erreur, il faut renseigner une URL avant d'afficher le graphe");
        return;
    }
    fetch(input.value)
        .then((res) => res.json())
        .then((data) => {
            const graph = document.querySelector("#graph");
            if (graph.hasChildNodes()) {
                graph.removeChild(graph.firstChild);
            }
            //TODO gérer le resize
            //window.addEventListener("resize", handleResize);
            graph.appendChild(new Graph(data, lang).getGraphNode());
        })
        .catch((reason) => alert(reason));
});

document
    .querySelector("#show-relationships")
    .addEventListener("change", (event) => {
        const labels = document.querySelectorAll("textPath");
        if (event.currentTarget.checked) {
            labels.forEach((label) => label.classList.remove("hide-label"));
        } else {
            labels.forEach((label) => label.classList.add("hide-label"));
        }
    });

document.querySelector("#download-svg").addEventListener("click", () => {
    const svg = document.querySelector("#graph").innerHTML;
    download(svg, "image/svg+xml", "test.svg");
});

function download(content, mimeType, filename) {
    const a = document.createElement("a"); // Create "a" element
    const blob = new Blob([content], { type: mimeType }); // Create a blob (file-like object)
    const url = URL.createObjectURL(blob); // Create an object URL from blob
    a.setAttribute("href", url); // Set "a" element link
    a.setAttribute("download", filename); // Set download filename
    a.click(); // Start downloading
}
