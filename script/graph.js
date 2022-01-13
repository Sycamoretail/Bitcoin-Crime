var min_time = 0,
    max_time = 1e30; // 时间窗口，min_time 和 max_time 分别表示最小时间和最大时间
var data_file = "./data/project.json";
let fontFamily;
let DATA;
let global_index = 0;
let nodeSet;
let linkSet;
let nodeScale;
let linkScale;
let chart;
let timeline;
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

function init() {
    DATA.sort((a, b) => a.time - b.time);
    nodeSet = new Set();
    linkSet = new Set();

    // 得到全图全时间信息
    timeline = new Set();
    let income = {};
    for(let txn of DATA){
        timeline.add(txn.time);
        if(!(txn.target in income)){
            income[txn.target] = txn.value;
        }
        else{
            income[txn.target] += txn.value;
        }
    }
    let values = [];
    for(let k in income){
        values.push(income[k]);
    }

    nodeScale = d3
        .scaleLinear()
        .domain([0, d3.max(values)])
        .rangeRound([3, 30]);
}

function option_update(timestamp, option) {
    // data为array, 其中元素为{time, source, target, value}

    // 首先查看是否有新的节点、边加入
	// console.log(timestamp, DATA[global_index].time);
    let new_nodes = [];
    let new_links = [];
    while (global_index < DATA.length) {
        let item = DATA[global_index];
        if (item.time > timestamp) break;
        // 查看是否是图中尚没有的节点
        if (!nodeSet.has(item.source)) {
            nodeSet.add(item.source);
            new_nodes.push({
                index: global_index,
                income: 0,
                balance: 0,
                outcome: 0,
                id: item.source,
                symbolSize: 5,
                transactions: [],
                input_queue: [],
                output_map: {},
            });
        } 
		if (!nodeSet.has(item.target)) {
            nodeSet.add(item.target);
            new_nodes.push({
                index: global_index,
                income: 0,
                outcome: 0,
                balance: 0,
                id: item.target,
                symbolSize: 5,
                transactions: [],
                input_queue: [],
                output_map: {},
            });
        }
        // 查看是否是图中没有的边
        if (!linkSet.has(item.source + "->" + item.target)) {
            linkSet.add(item.source + "->" + item.target);
            new_links.push({
                index: global_index,
                source: item.source,
                target: item.target,
                total: 0,
                transactions: [],
            });
        }
        global_index += 1;
    }

	Array.prototype.push.apply(option.series[0].data, new_nodes);
	Array.prototype.push.apply(option.series[0].links, new_links);

    // 更新所有节点和边
    function node_update(node) {
        while (node.index < global_index) {
            let item = DATA[node.index];
            if (item.source == node.id) {
                node.outcome += item.value;
                node.balance -= item.value;
                node.transactions.push(item);
            } else if (item.target == node.id) {
                node.income += item.value;
                node.balance += item.value;
                node.transactions.push(item);
            }
            node.index += 1;
        }

        node.symbolSize = nodeScale(node.income);

        function input_queue_update() {
            // 更新input queue的接口
            return [];
        }

        function output_map_update() {
            // 更新output map的接口
            return {};
        }
        node.input_queue = input_queue_update();
        node.output_map = output_map_update();
        return node;
    }

    function link_update(link) {
        while (link.index < global_index) {
            let item = DATA[link.index];
            if (item.source == link.source && item.target == link.target) {
                link.total += item.value;
                link.transactions.push(item);
            }
            link.index += 1;
        }
        return link;
    }

    // update node
    option.series[0].data.forEach(function (node, idx) {
		// console.log(idx);
		// console.log("node before update:");
		// console.log(node);
        try {
            if (!nodeSet.has(node.id)) {
                var exception = {
                    msg: "this node not in the original data",
                    data: node,
                };
                throw exception;
            }
			// console.log("node after update:");
            option.series[0].data[idx] = node_update(node);
			// console.log(option.series[0].data[idx]);
        } catch (e) {
            console.log(e.msg);
            console.log(e.data);
        }
    });

    // update link
    option.series[0].links.forEach(function (link, idx) {
		// console.log(idx);
		// console.log("link before update:");
		// console.log(link);
        try {
            if (!linkSet.has(link.source + "->" + link.target)) {
                var exception = {
                    msg: "this link not in the original data",
                    data: link,
                };
                throw exception;
            }
			// console.log("link after update:");
            option.series[0].links[idx] = link_update(link);
			// console.log(option.series[0].links[idx]);
        } catch (e) {
            console.log(e.msg);
            console.log(e.data);
        }
    });

    return option;
}

function adjust_data(graph) {
    // 根据graph中的link数据生成[{time, tx, rx, value}, ...]数据
    let data = [];
    graph.links.forEach(function (item) {
        data.push({
            time: item.time,
            source: item.source,
            target: item.target,
            value: item.value,
        });
    });
    return data;
}

// 用来绘制力导向图的函数
function draw_graph() {
    // let values = graph.nodes.map((d) => d.value);
    // const scale = d3
    //     .scaleLinear()
    //     .domain([d3.min(values), d3.max(values)])
    //     .rangeRound([5, 17]);

    let chartDom = document.getElementById("Graph");
    chart = echarts.init(chartDom);
    let option = {
        title: {
            // text: "Graph",
            // subtext: "subgraph",
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
	
	chart.setOption(option);

    // 对option_update测试
    // console.log(adjust_data(graph));
    // option_update(1694858790, adjust_data(graph), option);
    // console.log('after update', option);

    // function sleep(ms) {
    //     return new Promise((resolve) => setTimeout(resolve, ms));
    // }

    // async function show() {
    //     while (true) {
    //         option = option_update(1694858790, option);
    //      	chart.setOption(option);
    //         await sleep(1000, () => {});
    //     }
    // }
    // show();
}

function draw_timeline() {
    var global_width = $(window).width();
    var global_height = $(window).height();

	timeline = Array.from(timeline).sort((a, b) => a - b).map((d) => new Date(d * 1000));

    var sliderFill = d3
        .sliderBottom()
        .min(d3.min(timeline))
        .max(d3.max(timeline))
        .width(0.5 * global_width)
        .tickFormat(d3.timeFormat("%Y-%m-%d %H:%M:%S"))
		.step(1000 * 60 * 60 * 24)
        .fill("#2196f3")
        .on('onchange', timestamp => {
			unix_time = timestamp.getTime() / 1000;
			let option = chart.getOption();
			option = option_update(unix_time, option);
			chart.setOption(option);
        })

    var gFill = d3
        .select("#timeline")
        .append("svg")
        .attr("width", global_width)
        .attr("height", 0.15 * global_height)
        .append("g")
        .attr("transform", "translate(300,30)")

    gFill.call(sliderFill);
}

// main() 函数
function main() {
	init();
	draw_timeline();
    draw_graph();
}

d3.json(data_file).then(function (data) {
    DATA = data;
    set_ui();
    main();
});