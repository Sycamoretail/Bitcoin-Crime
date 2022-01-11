var min_time = 0,
    max_time = 1e30; // 时间窗口，min_time 和 max_time 分别表示最小时间和最大时间
var wallet = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"; // 所关注的设施钱包
var ROOT_PATH = "./data/visclass/"; // 数据所在根目录
let fontFamily;
let DATA;
const value_threshold = 0.001 * 1e8;

function set_ui() {
    // 设置字体
    let ua = navigator.userAgent.toLowerCase();
    // fontFamily = "Khand-Regular";
    fontFamily = "楷体";
    if (/\(i[^;]+;( U;)? CPU.+Mac OS X/gi.test(ua)) {
        fontFamily = "PingFangSC-Regular";
    }
    d3.select("body").style("font-family", fontFamily);
}

// 用来处理数据的函数，递归处理数据
// 将 [min_time,max_time] 这一时间窗内的数据放入 graph 中
// graph 是一个字典，其中有 nodes 和 links，用于传给 draw_graph 绘制 graph
function get_data(data, father, graph, nodes, depth) {
    if (data.sent_to.length > 100) return; // 数据太多的先不处理？

    if (depth <= 0) return;
    let k = 1;
    if (father) {
        // 如果 father 不为 null，说明现在想要计算的是 father 给当前节点的钱的流向，则忽略其他来源，按照father所占的权重递归计算
        let from_all = 0,
            from_father = 0;
        data.received_from.forEach(function (d) {
            if (d.time < max_time) {
                from_all += d.value;
                if (d.addr == father) {
                    from_father += d.value;
                }
            }
        });
        k = from_father / from_all;
    }
    if (k > 0) {
        data.sent_to.forEach(function (d) {
            if (d.hasOwnProperty("addr")) {
                let child = d.addr;
                // 这里添加边的逻辑还不太对的样子
                // 时间因素还需要考虑在内，才能确定钱的具体数额
                // (也就是说，这里的 k 值随着时间的不同应该是不同的)
                if (d.time < max_time) {
                    if (k * d.value > value_threshold) {
                        graph.links[graph.links.length] = {
                            source: data.addr,
                            target: child,
                            value: k * d.value,
                            time: d.time,
                        };

                        // 这一孩子节点也加入图中的节点中
                        if (child in nodes) {
                            graph.nodes[nodes[child]].value += k * d.value;
                        } else {
                            nodes[child] = graph.nodes.length;
                            graph.nodes[graph.nodes.length] = {
                                id: child,
                                value: k * d.value,
                            };
                        }

                        // 从这个孩子节点继续递归
                        // (不知道数据是不是足够，我就是抓取并处理了一些账户的数据)
                        try {
                            d3.json(ROOT_PATH + child + ".json").then(function (
                                n_data
                            ) {
                                if (n_data) {
                                    get_data(
                                        n_data,
                                        data.addr,
                                        graph,
                                        nodes,
                                        depth - 1
                                    );
                                }
                            });
                        } catch (error) {
                            console.log(child, "do not exist");
                        }
                    }
                }
            } else {
                console.log("One unknown address!");
            }
        });
    }
}

// 获取图数据
function get_graph(data) {
    let graph = { nodes: [], links: [] };
    let nodes = {};
    nodes[data.addr] = 0;
    let new_node = { id: data.addr, value: 0 }; // 起始节点
    data.received_from.forEach(function (d) {
        if (d.time < max_time) {
            // 计算 max_time 以前的总收益作为该节点的收益
            new_node.value += d.value;
        }
    });
    graph.nodes[graph.nodes.length] = new_node;
    get_data(data, null, graph, nodes, 3);
    return graph;
}

// 用来绘制力导向图的函数
function draw_graph(graph) {
    let values = graph.nodes.map((d) => d.value);
    const scale = d3
        .scaleLinear()
        .domain([d3.min(values), d3.max(values)])
        .rangeRound([5, 17]);

    let chartDom = document.getElementById("Graph");
    let myChart = echarts.init(chartDom);
    let option;

    graph.nodes.forEach(function (node) {
        node.symbolSize = scale(node.value);
    });
    option = {
        title: {
            text: "Graph",
            subtext: "subgraph",
            top: "bottom",
            left: "right",
        },
        tooltip: {},
        series: [
            {
                // name: 'Les Miserables',
                type: "graph",
                layout: "force",
                data: [],
                links: [],
                roam: true,
                label: {
                    position: "right",
                },
                force: {
                    repulsion: 100,
                },
                lineStyle: {
                    color: "source",
                    curveness: 0.2,
                },
            },
        ],
    };

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function show() {
        for (node of graph.nodes) {
            console.log("add node");
            option.series[0].data.push(node);
            myChart.setOption(option);
            await sleep(1000, () => {
                console.log("wake up");
            });
        }
    }
	show()
    // myChart.setOption(option);
    // let canvas = document.querySelector("canvas"),
    //     context = canvas.getContext("2d"),
    //     width = canvas.width,
    //     height = canvas.height;

    // let simulation = d3.forceSimulation()
    //     .force("link", d3.forceLink().id(function(d) { return d.id; }))
    //     .force("charge", d3.forceManyBody())
    //     .force("center", d3.forceCenter(width / 2, height / 2));

    // let values = graph.links.map(d => d.value);
    // const scale = d3.scaleLinear()
    //     .domain([d3.min(values), d3.max(values)])
    //     .rangeRound([3, 7]);

    // simulation
    //     .nodes(graph.nodes)
    //     .on("tick", ticked);
    // // console.log('simulation');
    // // console.log(simulation);

    // simulation.force("link")
    //     .links(graph.links);

    // d3.select(canvas)
    //     .call(d3.drag()
    //         .container(canvas)
    //         .subject(dragsubject)
    //         .on("start", dragstarted)
    //         .on("drag", dragged)
    //         .on("end", dragended));

    // // console.log('graph');
    // // console.log(graph);

    // function ticked() {
    //     context.clearRect(0, 0, width, height);

    //     context.beginPath();
    //     graph.links.forEach(drawLink);
    //     context.strokeStyle = "#aaa";
    //     context.stroke();

    //     context.beginPath();
    //     // console.log(graph.nodes);
    //     graph.nodes.forEach(drawNode);
    //     context.fill();
    //     context.strokeStyle = "#fff";
    //     context.stroke();
    // }

    // function dragsubject() {
    //     return simulation.find(d3.event.x, d3.event.y);
    // }

    // function dragstarted() {
    //     if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    //     d3.event.subject.fx = d3.event.subject.x;
    //     d3.event.subject.fy = d3.event.subject.y;
    // }

    // function dragged() {
    //     // console.log('hello', d3.event);
    //     d3.event.subject.fx = d3.event.x;
    //     d3.event.subject.fy = d3.event.y;
    // }

    // function dragended() {
    //     if (!d3.event.active) simulation.alphaTarget(0);
    //     d3.event.subject.fx = null;
    //     d3.event.subject.fy = null;
    // }

    // function drawLink(d) {
    //     context.moveTo(d.source.x, d.source.y);
    //     context.lineTo(d.target.x, d.target.y);
    // }

    // function drawNode(d) {
    //     // console.log(d);
    //     // console.log(scasle(d.value));
    //     context.moveTo(d.x + 3, d.y);
    //     context.arc(d.x, d.y, scale(d.value), 0, 2 * Math.PI);
    // }
}

// 用于改变时间窗口
// 该函数根据相应的鼠标操作改变 min_time 和 max_time 的值
function change_time() {}

// main() 函数
// 每次有变化时，调用该函数，传入参数为 DATA
function main(data) {
    let graph = get_graph(data);
    console.log(graph);
    draw_graph(graph);
}

d3.json(ROOT_PATH + wallet + ".json").then(function (data) {
    DATA = data;
    set_ui();
    main(DATA);
});
