const DefaultGraphSettings = {
    LINK_FORCE_DISTANCE: 300,
    CHARGE_FORCE_STRENGTH: -400,
    NODE_RADIUS: 30,
    LINK_CURVATURE: 0.15,
    LINK_NODE_INTERSECTION_OFFSET: -5,
};

export class Graph {
    dataNodes;
    dataLinks;
    dataThesoLinks;
    nodes;
    links;
    svg;
    width = window.innerWidth;
    height = window.innerHeight;
    simulation;
    color = d3.scaleOrdinal(d3.schemeCategory10);
    linkForceDistance;
    chargeForceStrength;
    nodeRadius;
    linkCurvature;
    linkNodeIntersectionOffset;
    language;

    constructor(data, language, params = DefaultGraphSettings) {
        //Initialisation des données
        const relationshipsToInclude = ["skos__narrower", "skos__exactMatch"];
        console.log(data);
        this.dataLinks = data.relationships.filter(
            (value) =>
                value.type == "relationship" &&
                relationshipsToInclude.includes(value.label)
        );

        this.dataLinks.forEach(function (l) {
            l.source = l.start.id;
            l.target = l.end.id;
        });
        this.dataNodes = data.nodes.filter((value) => value.type == "node");

        this.dataThesoLinks = data.thesaurus.filter(
            (value) => value.type == "relationship"
        );

        this.language = language;

        //Suppression des noeuds liés à un thésaurus (la coloration fait la différence entre thésaurus)
        const nodesToRemove = [];
        const linksToRemove = this.dataLinks.filter(
            (link) => link.label == "skos__inScheme"
        );

        linksToRemove.forEach((link) => {
            console.log(link);
            return nodesToRemove.push(link.end.properties.uri);
        });

        this.dataNodes = this.dataNodes.filter(
            (node) => !nodesToRemove.includes(node.properties.uri)
        );

        this.dataLinks = this.dataLinks.filter(
            (link) => !linksToRemove.includes(link)
        );

        console.log(this.dataNodes);
        console.log(this.dataLinks);
        //Initialisation des paramètres
        this.linkForceDistance = params.LINK_FORCE_DISTANCE
            ? params.LINK_FORCE_DISTANCE
            : DefaultGraphSettings.LINK_FORCE_DISTANCE;
        this.chargeForceStrength = params.CHARGE_FORCE_STRENGTH
            ? params.CHARGE_FORCE_STRENGTH
            : DefaultGraphSettings.CHARGE_FORCE_STRENGTH;
        this.nodeRadius = params.NODE_RADIUS
            ? params.NODE_RADIUS
            : DefaultGraphSettings.NODE_RADIUS;
        this.linkCurvature = params.LINK_CURVATURE
            ? params.LINK_CURVATURE
            : DefaultGraphSettings.LINK_CURVATURE;
        this.linkNodeIntersectionOffset = params.LINK_NODE_INTERSECTION_OFFSET
            ? params.LINK_NODE_INTERSECTION_OFFSET
            : DefaultGraphSettings.LINK_NODE_INTERSECTION_OFFSET;

        //Initialisation de la simulation des forces
        this.simulation = d3
            .forceSimulation(this.dataNodes)
            .force(
                "link",
                d3
                    .forceLink(this.dataLinks)
                    .id((d) => d.id)
                    .distance(this.linkForceDistance)
            )
            .force(
                "charge",
                d3.forceManyBody().strength(this.chargeForceStrength)
            )
            .on("tick", () => {
                this.links.selectAll("path").attr("d", this.linkArc);

                this.nodes
                    .selectAll("circle")
                    .attr("cx", (d) => d.x)
                    .attr("cy", (d) => d.y);

                this.nodes
                    .selectAll("text")
                    .attr("x", (d) => d.x)
                    .attr("y", (d) => d.y);
            });
    }

    onNodeDragStart = (e) => {
        if (!e.active) this.simulation.alphaTarget(0.3).restart();
        e.subject.fx = e.subject.x;
        e.subject.fy = e.subject.y;
    };

    //Actualisation de la position du sujet lors du drag
    onNodeDragged = (e) => {
        e.subject.fx = e.x;
        e.subject.fy = e.y;
    };

    //Arret de la simulation de façon progressive
    onNodeDragEnd = (e) => {
        if (!e.active) this.simulation.alphaTarget(0);
        e.subject.fx = null;
        e.subject.fy = null;
    };

    //Lors du zoom sur le graphe
    onGraphZoom(event) {
        d3.select("g").attr("transform", event.transform);
    }

    //Verifie si une relation existe dans le tableau dataThesoLinks avec comme point de départ un noeud avec l'URI passée en paramètre
    isInTheso(uri) {
        const relationships = this.dataThesoLinks.filter(
            (thesoRel) => thesoRel.start.properties.uri == uri
        );
        if (relationships.length > 0) {
            return relationships[0].end.properties.uri;
        }
        return "no-thesaurus-associated";
    }

    //Filtre un tableau de strings et vérifie la présence d'un tag de langue ('@fr', '@en', etc...) Si ou, retourne la valeur avant le tag
    filterLangArray(array) {
        const values = array.filter((langValue) => {
            const [string, langTag] = langValue.split("@");
            return langTag == this.language;
        });
        if (values.length > 0) {
            return values[0].split("@")[0];
        }
        return "";
    }

    //Création du svg de base
    initGraph() {
        return d3
            .create("svg")
            .attr("viewBox", [
                -this.width / 2,
                -this.height / 2,
                this.width,
                this.height,
            ])
            .attr("width", this.width)
            .attr("height", this.height)
            .call(d3.zoom().on("zoom", this.onGraphZoom));
    }

    //Definition de la tête de flèche pour les liens
    defineLinkArrowHead() {
        this.svg
            .append("defs")
            .append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 0 20 20")
            .attr("refX", 4)
            .attr("refY", 10)
            .attr("markerWidth", 20)
            .attr("markerHeight", 20)
            .attr("orient", "auto")
            .attr("markerUnits", "userSpaceOnUse")
            .append("path")
            .attr("d", "M 20 0 L 0 10 L 20 20")
            .attr("fill", "#000000");
    }

    createNodes(parent) {
        const nodes = parent
            .append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .attr("style", "z-index:1000")
            .selectAll("g")
            .data(this.dataNodes)
            .join("g")
            .on("click", (event) =>
                window
                    .open(event.srcElement.__data__.properties.uri, "_blank")
                    .focus()
            )
            .style("cursor", "pointer");

        nodes
            .append("circle")
            .attr("r", this.nodeRadius)

            .attr("fill", (d) =>
                d3.color(this.color(this.isInTheso(d.properties.uri))).darker(2)
            );

        nodes
            .append("text")
            .text((d) => {
                if (d.labels.includes("skos__Concept")) {
                    return this.filterLangArray(d.properties.skos__prefLabel);
                } else {
                    return d.properties.uri;
                }
            })
            .attr("fill", (d) =>
                d3
                    .color(this.color(this.isInTheso(d.properties.uri)))
                    .brighter(1)
            )
            .attr("stroke", "none")
            .attr("text-anchor", "middle")
            .attr("alignement-baseline", "center")
            .attr("style", "font-family: Helvetica;");

        nodes.call(
            d3
                .drag()
                .on("start", this.onNodeDragStart)
                .on("drag", this.onNodeDragged)
                .on("end", this.onNodeDragEnd)
        );
        return nodes;
    }

    createLinks(parent) {
        const links = parent
            .append("g")
            .selectAll("g")
            .data(this.dataLinks)
            .join("g");

        links
            .append("path")
            .attr("stroke-width", "3")
            .attr("marker-start", "url(#arrowhead)")
            .attr("id", (d) => d.id)
            .attr("fill", "none")
            .attr("stroke", (d) =>
                relationships_colors[d.label]
                    ? relationships_colors[d.label]
                    : "#000000"
            );

        links
            .append("text")
            .attr("text-anchor", "middle")
            //.attr("transform", "translate(0, 6)")
            .attr("style", "pointer-events: none")
            .attr("dy", "-10")
            .append("textPath")
            .text((d) =>
                relationships_dict[d.label]
                    ? relationships_dict[d.label]
                    : d.label
            )
            .attr("xlink:href", (d) => `#${d.id}`)
            .attr("startOffset", "50%")
            .attr("class", "hide-label");

        return links;
    }

    linkArc = (d) => {
        const source = d.source;
        const target = d.target;

        // Calculate differences in x and y coordinates
        var dx = target.x - source.x,
            dy = target.y - source.y,
            dr = Math.sqrt(dx * dx + dy * dy);

        // Calculate intersection points with the source circle
        const t1 = this.nodeRadius / dr;
        const x1 = source.x + t1 * dx;
        const y1 = source.y + t1 * dy;

        // Calculate intersection points with the target circle
        const t2 = this.nodeRadius / dr;
        const x2 = target.x - t2 * dx;
        const y2 = target.y - t2 * dy;

        const sx1 = x1 + this.linkNodeIntersectionOffset * (dy / dr);
        const sy1 = y1 - this.linkNodeIntersectionOffset * (dx / dr);

        const sx2 = x2 + this.linkNodeIntersectionOffset * (dy / dr);
        const sy2 = y2 - this.linkNodeIntersectionOffset * (dx / dr);

        const cx = (x1 + x2) / 2 - this.linkCurvature * dy;
        const cy = (y1 + y2) / 2 + this.linkCurvature * dx;

        // Return the SVG path description for a quadratic Bézier curve
        return `M${sx2},${sy2} Q${cx},${cy} ${sx1},${sy1}`;
    };

    getGraphNode() {
        this.svg = this.initGraph();
        this.defineLinkArrowHead();

        const content = this.svg.append("g");
        this.links = this.createLinks(content);

        this.nodes = this.createNodes(content);

        return this.svg.node();
    }
}

const relationships_dict = {
    skos__broader: "Terme Générique",
    skos__narrower: "Terme Spécifique",
    skos__exactMatch: "Alignement Exact",
    skos__related: "Terme Associé",
    ns0__isReplacedBy: "Est replacé par",
    ns0__replaces: "Remplace",
    ns2__memberOf: "Membre de",
};

const relationships_colors = {
    skos__broader: "#ED4E8F",
    skos__narrower: "#ED4E8F",
    skos__exactMatch: "#8A2BE2",
    skos__related: "#7BC043",
    ns0__isReplacedBy: "#35AB66",
    ns0__replaces: "#35AB66",
    ns2__memberOf: "#9ED5FA",
};
