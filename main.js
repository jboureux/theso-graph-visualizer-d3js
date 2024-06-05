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
