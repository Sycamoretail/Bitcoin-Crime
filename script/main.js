let DATA = null;

function data_transform(data) {

}
var canvas = document.querySelector("canvas"),
    context = canvas.getContext("2d"),
    width = canvas.width,
    height = canvas.height;

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));

d3.json("data/test.json", function(error, graph) {
    if (error) throw error;

    let values = graph.links.map(d => d.value);

    const scale = d3.scaleLinear()
        .domain([d3.min(values), d3.max(values)])
        .rangeRound([3, 7]);

    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);
    console.log(simulation);

    simulation.force("link")
        .links(graph.links);

    d3.select(canvas)
        .call(d3.drag()
            .container(canvas)
            .subject(dragsubject)
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    console.log('graph', graph);

    function ticked() {
        context.clearRect(0, 0, width, height);

        context.beginPath();
        graph.links.forEach(drawLink);
        context.strokeStyle = "#aaa";
        context.stroke();

        context.beginPath();
        console.log(graph.nodes);
        graph.nodes.forEach(drawNode);
        context.fill();
        context.strokeStyle = "#fff";
        context.stroke();
    }

    function dragsubject() {
        return simulation.find(d3.event.x, d3.event.y);
    }


    function dragstarted() {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d3.event.subject.fx = d3.event.subject.x;
        d3.event.subject.fy = d3.event.subject.y;
    }

    function dragged() {
        console.log('hello', d3.event);
        d3.event.subject.fx = d3.event.x;
        d3.event.subject.fy = d3.event.y;
    }

    function dragended() {
        if (!d3.event.active) simulation.alphaTarget(0);
        d3.event.subject.fx = null;
        d3.event.subject.fy = null;
    }

    function drawLink(d) {
        context.moveTo(d.source.x, d.source.y);
        context.lineTo(d.target.x, d.target.y);
    }

    function drawNode(d) {
        // console.log(d);
        // console.log(scasle(d.value));
        context.moveTo(d.x + 3, d.y);
        context.arc(d.x, d.y, scale(d.value), 0, 2 * Math.PI);
    }
});