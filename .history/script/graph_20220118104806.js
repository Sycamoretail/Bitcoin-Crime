var min_time = 0,
    max_time = 1e30; // 时间窗口，min_time 和 max_time 分别表示最小时间和最大时间
var data_file = "./data/new_project.json";
const ADDR = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
let fontFamily;
let DATA;
let global_index = 0;
let nodeSet;
let linkSet;
let nodeScale;
let linkScale;
let chart;
let timeline;
const value_threshold = 5000000;
const rate = 1e8;
let markNode;
let painting;
let isPainting = 0;

function set_ui() {
    // 设置字体
    let ua = navigator.userAgent.toLowerCase();
    // fontFamily = "Khand-Regular";
    fontFamily = "楷体";
    if (/\(i[^;]+;( U;)? CPU.+Mac OS X/gi.test(ua)) {
        fontFamily = "PingFangSC-Regular";
    }
    d3.select("body").style("font-family", fontFamily);
}

function init() {
    DATA.sort((a, b) => a.time - b.time);
    // 筛选数据
    // DATA = DATA.filter((a) => a.target != "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" || a.value > 100000)
    DATA = DATA.filter(
        (a) =>
        a.time < 1596211200 &&
        (a.target != ADDR ||
            (a.target == ADDR && a.value >= value_threshold))
    ); // 2020-08-01 00:00:00
    nodeSet = new Set();
    linkSet = new Set();
    markNode = new Set();

    // 得到全图全时间信息
    timeline = new Set();
    let income = {};
    for (let txn of DATA) {
        timeline.add(txn.time);
        if (!(txn.target in income)) {
            income[txn.target] = txn.value;
        } else {
            income[txn.target] += txn.value;
        }
    }
    let values = [];
    for (let k in income) {
        values.push(income[k]);
    }

    nodeScale = d3
        .scaleLinear()
        .domain([0, d3.max(values)])
        .rangeRound([10, 50]);
}

function backward(option) {
    nodeSet = new Set();
    linkSet = new Set();
    global_index = 0;
    option.series.forEach(function(d) {
        d.data = [];
        d.links = [];
    });
}

function option_update(timestamp, option) {
    // data为array, 其中元素为{time, source, target, value}

    // 首先查看是否有新的节点、边加入
    // console.log(timestamp, DATA[global_index].time);
    if (timestamp) {
        if (global_index > 0 && DATA[global_index - 1].time > timestamp) {
            backward(option);
        }

        let new_nodes = [];
        let new_links = [];
        while (global_index < DATA.length) {
            let item = DATA[global_index];
            if (item.time > timestamp) break;

            // 为 source 和 target 账户设置相应的类别
            let g1, g2;
            if (item.source == ADDR) {
                g1 = 1;
                g2 = 2;
            } else if (item.target == ADDR) {
                g1 = 0;
                g2 = 1;
            } else {
                g1 = 2;
                g2 = 2;
            }

            // 查看是否是图中尚没有的节点
            if (!nodeSet.has(item.source)) {
                nodeSet.add(item.source);
                let c1;
                if (markNode.has(item.source)) {
                    c1 = 3;
                } else {
                    c1 = g1;
                }
                new_nodes.push({
                    index: global_index,
                    income: 0,
                    outcome: 0,
                    id: item.source,
                    symbolSize: 5,
                    transactions: [],
                    input_queue: [],
                    output_map: {},
                    category: c1,
                    group: g1,
                    painted: 0,
                    itemStyle: {
                        color: undefined,
                        opacity: 1,
                    },
                });
            }
            if (!nodeSet.has(item.target)) {
                nodeSet.add(item.target);
                let c2;
                if (markNode.has(item.target)) {
                    c2 = 3;
                } else {
                    c2 = g2;
                }
                new_nodes.push({
                    index: global_index,
                    income: 0,
                    outcome: 0,
                    id: item.target,
                    symbolSize: 5,
                    transactions: [],
                    input_queue: [],
                    output_map: {},
                    category: c2,
                    group: g2,
                    painted: 0,
                    itemStyle: {
                        color: undefined,
                        opacity: 1,
                    },
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
                    painted: 0,
                    lineStyle: {
                        color: undefined,
                        opacity: 1,
                    },
                });
            }
            global_index += 1;
        }

        Array.prototype.push.apply(option.series[0].data, new_nodes);
        Array.prototype.push.apply(option.series[0].links, new_links);
    }

    // 更新所有节点和边
    function node_update(node) {
        while (node.index < global_index) {
            let item = DATA[node.index];
            if (item.source == node.id) {
                node.outcome += item.value;
                node.transactions.push(item);
                curr_value = item.value;
                // if (node.output_map[item.target] == undefined) {
                //     node.output_map[item.target] = {}
                // }
                while (curr_value > 0) {
                    let head = node.input_queue[0];
                    if (head == undefined) {
                        if (node.output_map[node.id] == undefined) {
                            node.output_map[node.id] = {}
                        }
                        if (node.output_map[node.id][item.target] == undefined) {
                            node.output_map[node.id][item.target] = 0;
                        }
                        node.output_map[node.id][item.target] += curr_value;
                        break;
                    }
                    if (node.output_map[head.src] == undefined) {
                        node.output_map[head.src] = {}
                    }
                    if (node.output_map[head.src][item.target] == undefined) {
                        node.output_map[head.src][item.target] = 0;
                    }
                    if (head.val > curr_value) {
                        node.input_queue[0] -= curr_value;
                        node.output_map[head.src][item.target] += curr_value;
                        curr_value = 0;
                    } else {
                        curr_value -= head.val;
                        node.input_queue.shift();
                        node.output_map[head.src][item.target] += head.val;
                    }
                }
            } else if (item.target == node.id) {
                node.income += item.value;
                node.transactions.push(item);
                node.input_queue.push({ src: item.source, val: item.value })
            }
            node.index += 1;
        }

        node.symbolSize = nodeScale(node.income);

        if (markNode.has(node.id)) {
            node.category = 3;
        } else {
            node.category = node.group;
        }

        // function input_queue_update() {
        //     // 更新input queue的接口

        //     return [];
        // }

        // function output_map_update() {
        //     // 更新output map的接口
        //     return {};
        // }
        // node.input_queue = input_queue_update();
        // node.output_map = output_map_update();
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
    option.series[0].data.forEach(function(node, idx) {
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
    option.series[0].links.forEach(function(link, idx) {
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
            if (e != undefined) {
                console.log(e.msg);
                console.log(e.data);
            }
        }
    });

    function paint(node, src, val_p, val_t, tot) {
        for (let dst in node.output_map[src]) {
            next_val_p = 0;
            next_val_t = 0;
            for (let edge of option.series[0].links) {
                if (edge.source == node.id && edge.target == dst) {
                    next_val_p = (val_p * node.output_map[src][dst]) / val_t;
                    next_val_t = edge.total;
                    edge.lineStyle.opacity = next_val_p / tot;
                }
            }
            for (let next_node of option.series[0].data) {
                if (next_node.id == dst) {
                    next_node.itemStyle.opacity = next_val_p / tot;
                    paint(next_node, node.id, next_val_p, next_val_t, tot);
                }
            }
        }
    }

    if (isPainting) {
        for (let edge of option.series[0].links) {
            edge.lineStyle.opacity = 0.00005;
            edge.lineStyle.color = 'black';
        }
        for (let node of option.series[0].data) {
            if (node.id != painting.id) {
                node.itemStyle.opacity = 0.00005;
            }
            node.itemStyle.color = 'black';
        }
        paint(painting, painting.id, painting.outcome, painting.outcome, painting.outcome);
    } else {
        for (let edge of option.series[0].links) {
            edge.lineStyle.opacity = 1;
            edge.lineStyle.color = undefined;
        }
        for (let node of option.series[0].data) {
            node.itemStyle.opacity = 1;
            node.itemStyle.color = undefined;
        }
    }

    return option;
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
        tooltip: {
            trigger: "item",
            formatter: function(params) {
                if (params.dataType == "node") {
                    return (
                        "id: " +
                        params.data.id +
                        "<br>income: " +
                        params.data.income.toString() +
                        "<br>outcome: " +
                        params.data.outcome.toString() +
                        (isPainting ? ("<br>percentage: " + params.data.itemStyle.opacity.toString()) : "")
                    );
                }
                if (params.dataType == "edge") {
                    return (
                        "source: " +
                        params.data.source +
                        "<br>target: " +
                        params.data.target +
                        "<br>value: " +
                        params.data.total.toString() +
                        (isPainting ? ("<br>percentage: " + params.data.lineStyle.opacity.toString()) : "")
                    );
                }
            },
        },
        legend: [{
            // selectedMode: 'single',
            data: ["被骗钱包", "涉事钱包", "可能流向", "标记钱包"],
        }, ],
        series: [{
            // name: '',
            type: "graph",
            layout: "force",
            data: [],
            links: [],
            categories: [
                { name: "被骗钱包" },
                { name: "涉事钱包" },
                { name: "可能流向" },
                { name: "标记钱包" },
            ],
            roam: true,
            // 添加箭头
            edgeSymbol: ["none", "arrow"],
            edgeSymbolSize: [0, 5],
            // 可拖拽
            draggable: true,
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
        }, ],
    };

    chart.setOption(option);

    // 染色函数


    chart.on("click", function(params) {
        d3.select('#show_info').remove();

        // d3.select("#record").selectAll("*").remove();
        if (params.dataType == "node") {
            d3.select('body').append('div').attr('id', 'show_info').style('position', 'absolute')
                .style('right', '0%').style('top', '0%').style('width', '25%').style('height', '100%');
            // d3.select('#show_info').selectAll('*').remove();

            let show_info = d3.select('#show_info');
            show_info.append('div').attr('id', 'record').style('width', '100%').style('height', '90%').style('overflow-y', 'scroll').style('overflow-x', 'scroll');
            show_info.append('div').attr('id', 'select').style('width', '100%').style('height', '10%');
            let width = 0.25 * $(window).width();
            let height = $(window).height();
            let entry_height = 0.05 * height;
            let max_height =
                entry_height * (5 + params.data.transactions.length);
            let svg = d3
                .select("#record")
                .append("svg")
                .attr("viewBox", "0, 0, " + width + ", " + max_height);
            // id, income, outcome
            let meta_datas = [
                { wallet: params.data.id },
                { income: (params.data.income / rate).toFixed(4) + "BTC" },
                { outcome: (params.data.outcome / rate).toFixed(4) + "BTC" },
            ];
            for (let i = 0; i < meta_datas.length; ++i) {
                let key = Object.keys(meta_datas[i])[0];
                let val = meta_datas[i][key];
                let color = key == "wallet" ? "yellow" : "lightblue";
                let g = svg.append("g").attr("transform", function(d, _) {
                    return "translate(0, " + i * entry_height + ")";
                });

                g.append("rect")
                    .attr("width", width)
                    .attr("height", entry_height)
                    .attr("rx", 8)
                    .attr("stroke", "white")
                    .attr("stroke-width", 0.8)
                    .attr("fill", color)
                    .attr("fill-opacity", 0.5);

                g.append("text")
                    .attr("dy", "1.5em")
                    .text((key == "wallet" ? "" : key + ": ") + val);
            }
            for (let i = 0; i < params.data.transactions.length; ++i) {
                let g = svg
                    .append("g")
                    .attr("transform", function(d, _) {
                        return (
                            "translate(0, " +
                            (i + meta_datas.length) * entry_height +
                            ")"
                        );
                    })
                    .on("mouseover", function(d) {
                        let addr =
                            txn.source == params.data.id ?
                            txn.target :
                            txn.source;
                        d3.select(this).select("text").text(addr);
                        d3.select(this).select("rect").attr("stroke", "black");
                    })
                    .on("mouseout", function(d) {
                        d3.select(this)
                            .select("text")
                            .text(
                                new Date(txn.time * 1000).toUTCString() +
                                " " +
                                (txn.value / rate).toFixed(4) +
                                "BTC"
                            );
                        d3.select(this).select("rect").attr("stroke", "white")
                    });

                let txn = params.data.transactions[i];
                let color = txn.source == params.data.id ? "red" : "lightgreen";
                if (txn.source == params.data.id) {
                    color = "red";
                    addr = txn.target;
                } else {
                    color = "lightgreen";
                    addr = txn.source;
                }
                g.append("rect")
                    .attr("width", width)
                    .attr("height", entry_height)
                    .attr("rx", 8)
                    .attr("stroke", "white")
                    .attr("stroke-width", 1)
                    .attr("fill", color)
                    .attr("fill-opacity", 0.5);

                g.append("text")
                    .attr("dy", "1.5em")
                    .attr("x", 10)
                    .text(
                        new Date(txn.time * 1000).toUTCString() +
                        " " +
                        (txn.value / rate).toFixed(4) +
                        "BTC"
                    );
            }

            let select_svg = d3
                .select("#select")
                .append("svg");
            let select_g = select_svg.append("g")
                .attr("transform", `translate(${width * 0.125},${height*0.02})`)

            select_g.append("rect")
                .attr("width", width * 0.25)
                .attr("height", height * 0.04)
                .attr("rx", 8)
                .attr("stroke", "white")
                .attr("stroke-width", 1)
                .attr("fill", 'red')
                .attr("fill-opacity", 0.5)
                .on("mouseover", function(e, d) {
                    d3.select(this).attr("stroke", "black");
                })
                .on("mouseout", function(e, d) {
                    d3.select(this).attr("stroke", "white");
                })
                .on("click", function(e, d) {
                    if (params.data.category == 3) {
                        params.data.category = params.data.group;
                        markNode.delete(params.data.id);
                        select_g.select('text').text("标记该钱包");
                    } else {
                        params.data.category = 3;
                        markNode.add(params.data.id);
                        select_g.select('text').text("取消该标记");
                    }
                    let new_option = chart.getOption();
                    new_option = option_update(null, new_option);
                    chart.setOption(new_option);
                    // select_g.selectAll('*').remove();
                });

            let select_text = '标记该钱包';
            if (params.data.category == 3) {
                select_text = '取消该标记';
            }
            select_g.append("text")
                .attr("dy", "2.5em")
                .attr("x", -3)
                .text(select_text);

            // let select_svg2 = d3
            //     .select("#select")
            //     .append("svg");
            let select_g2 = select_svg.append("g")
                .attr("transform", `translate(${width*0.625},${height*0.02})`);

            console.log(width, height);

            select_g2.append("rect")
                .attr("width", width * 0.25)
                .attr("height", height * 0.04)
                .attr("rx", 8)
                .attr("stroke", "white")
                .attr("stroke-width", 1)
                .attr("fill", 'blue')
                .attr("fill-opacity", 0.5)
                .on("mouseover", function(e, d) {
                    d3.select(this).attr("stroke", "black");
                })
                .on("mouseout", function(e, d) {
                    d3.select(this).attr("stroke", "white");
                })
                .on("click", function(e, d) {
                    console.log('isPainting', isPainting);
                    if (isPainting == 1) {
                        painting = null;
                        isPainting = 0;
                    } else {
                        painting = params.data;
                        isPainting = 1;
                    }
                    let new_option = chart.getOption();
                    new_option = option_update(null, new_option);
                    chart.setOption(new_option);
                    // select_g.selectAll('*').remove();
                });

            let select_text2 = '染色该钱包';
            if (isPainting == 1) {
                select_text2 = '取消染色';
            }
            console.log(select_text2)
            select_g2.append("text")
                .attr("dy", "2.5em")
                .attr("x", -3)
                .text(select_text2);

        }
        if (params.dataType == "edge") {
            d3.select('body').append('div').attr('id', 'show_info').style('position', 'absolute')
                .style('right', '0%').style('top', '0%').style('width', '25%').style('height', '100%');
            // d3.select('#show_info').selectAll('*').remove();

            let show_info = d3.select('#show_info');
            show_info.append('div').attr('id', 'record').style('width', '100%').style('height', '100%').style('overflow-y', 'scroll').style('overflow-x', 'scroll')
                // show_info.append('div').attr('id','select').style('width','100%').style('height','10%');

            let width = 0.25 * $(window).width();
            let height = $(window).height();
            let entry_height = 0.05 * height;
            let max_height =
                entry_height * (5 + params.data.transactions.length);
            let svg = d3
                .select("#record")
                .append("svg")
                .attr("viewBox", "0, 0, " + width + ", " + max_height);
            // source, target
            let meta_datas = [
                { source: params.data.source },
                { target: params.data.target },
            ];
            for (let i = 0; i < meta_datas.length; ++i) {
                let key = Object.keys(meta_datas[i])[0];
                let val = meta_datas[i][key];
                let color = "lightblue";
                let g = svg.append("g").attr("transform", function(d, _) {
                    return "translate(0, " + i * entry_height + ")";
                });

                g.append("rect")
                    .attr("width", width)
                    .attr("height", entry_height)
                    .attr("rx", 8)
                    .attr("stroke", "white")
                    .attr("stroke-width", 0.8)
                    .attr("fill", color)
                    .attr("fill-opacity", 0.5);

                g.append("text")
                    .attr("dy", "1.5em")
                    .text(key + ": " + val);
            }
            for (let i = 0; i < params.data.transactions.length; ++i) {
                let g = svg
                    .append("g")
                    .attr("transform", function(d, _) {
                        return (
                            "translate(0, " +
                            (i + meta_datas.length) * entry_height +
                            ")"
                        );
                    })
                    .on("mouseover", function(d) {
                        d3.select(this).select("rect").attr("stroke", "black");
                    })
                    .on("mouseout", function(d) {
                        d3.select(this).select("rect").attr("stroke", "white")
                    });

                let txn = params.data.transactions[i];
                let color = "lightgreen";
                g.append("rect")
                    .attr("width", width)
                    .attr("height", entry_height)
                    .attr("rx", 8)
                    .attr("stroke", "white")
                    .attr("stroke-width", 1)
                    .attr("fill", color)
                    .attr("fill-opacity", 0.5);

                g.append("text")
                    .attr("dy", "1.5em")
                    .attr("x", 10)
                    .text(
                        new Date(txn.time * 1000).toUTCString() +
                        " " +
                        (txn.value / rate).toFixed(4) +
                        "BTC"
                    );
            }
        }
    });

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

    timeline = Array.from(timeline)
        .sort((a, b) => a - b)
        .map((d) => new Date(d * 1000));

    var sliderFill = d3
        .sliderBottom()
        .min(d3.min(timeline))
        .max(d3.max(timeline))
        .width(0.5 * global_width)
        .tickFormat(d3.timeFormat("%m-%d %Hh"))
        .step(1000 * 60 * 60)
        .fill("#2196f3")
        .on("onchange", (timestamp) => {
            unix_time = timestamp.getTime() / 1000;
            let option = chart.getOption();
            option = option_update(unix_time, option);
            chart.setOption(option);
        });

    var gFill = d3
        .select("#timeline")
        .append("svg")
        .attr("width", global_width * 0.75)
        .attr("height", 0.15 * global_height)
        .append("g")
        .attr("transform", `translate(${global_width*0.75*0.1},${global_height*0.15*0.5})`);

    gFill.call(sliderFill);
}

// main() 函数
function main() {
    init();
    draw_timeline();
    draw_graph();
}

d3.json(data_file).then(function(data) {
    DATA = data;
    set_ui();
    main();
});