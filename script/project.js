// var min_time = 0, max_time = 1e30;   // 时间窗口，min_time 和 max_time 分别表示最小时间和最大时间
var wallet = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';   // 所关注的设施钱包
let fontFamily;
let DATA;
let global_index;
let old_index;
let graph;
let addr2idx;

function set_ui() {
    // 设置字体
    let ua = navigator.userAgent.toLowerCase();
    // fontFamily = "Khand-Regular";
    fontFamily = '楷体';
    if (/\(i[^;]+;( U;)? CPU.+Mac OS X/gi.test(ua)) {
        fontFamily = "PingFangSC-Regular";
    }
    d3.select("body")
        .style("font-family", fontFamily);
}

// 用来绘制力导向图的函数
function draw_graph(graph){
    let values = graph.nodes.map(d => d.income);
    const scale = d3.scaleLinear()
        .domain([d3.min(values), d3.max(values)])
        .rangeRound([5, 17]);

    let chartDom = document.getElementById('Graph');
    let myChart = echarts.init(chartDom);
    let option;
    
    graph.nodes.forEach(function (node) {
        node.symbolSize = scale(node.income);
    });
    option = {
        title: {
            // text: 'Graph',
            // subtext: 'subgraph',
            top: 'bottom',
            left: 'right'
        },
        tooltip: {},
        series: [
            {
                // name: 'Les Miserables',
                type: 'graph',
                layout: 'force',
                data: graph.nodes,
                links: graph.links,
                roam: true,
                label: {
                    position: 'right'
                },
                force: {
                    repulsion: 100
                },
                lineStyle: {
                    color: 'source',
                    curveness: 0.2
                }
            }
        ]
    };
    myChart.setOption(option);
}


function get_graph(data){
    // 按照时间从小到大排序
    let links = {};

    data.sort(function(a,b){return a.time-b.time;})
    for(let tx of data){   // 对于数据中的每一笔交易

        if(!(tx.target in addr2idx)){   // 收款方不在 addr2idx 中，说明 graph 中还没有该账户的结点
            addr2idx[tx.target] = graph.nodes.length;
            let new_node = {"global_index":global_index,"balance":0,"income":0,"outcome":0,"id":tx.target,"transactions":[]};
            graph.nodes[graph.nodes.length] = new_node;
        }
        if(!(tx.source in addr2idx)){   // 发款方不在 addr2idx 中，说明 graph 中还没有该账户的结点
            addr2idx[tx.source] = graph.nodes.length;
            let new_node = {"global_index":global_index,"balance":0,"income":0,"outcome":0,"id":tx.source,"transactions":[]};
            graph.nodes[graph.nodes.length] = new_node;
        }

        // 收款方的 income 增加，transactions 中添加上该条交易记录
        let idx = graph.nodes[addr2idx[tx.target]].transactions.length;
        graph.nodes[addr2idx[tx.target]].transactions[idx] = tx;
        graph.nodes[addr2idx[tx.target]].income += tx.value;

        // 发款方的 outcome 增加，transactions 中添加上该条交易记录
        idx = graph.nodes[addr2idx[tx.source]].transactions.length;
        graph.nodes[addr2idx[tx.source]].transactions[idx] = tx;
        graph.nodes[addr2idx[tx.source]].outcome += tx.value;

        if(!(tx.source in links)){
            links[tx.source] = {};
        }
        if(!(tx.target in links[tx.source])){
            links[tx.source][tx.target] = {"total":0,"transactions":[]};
        }

        // 将该条交易添加到 source 到 target 的边中
        links[tx.source][tx.target].total += tx.value;
        idx = links[tx.source][tx.target].transactions.length;
        links[tx.source][tx.target].transactions[idx] = tx;

    }

    // 将统计出的边添加到 graph 中
    for(let s in links){
        for(let t in links[s]){
            let new_link = links[s][t];
            new_link.source = s;
            new_link.target = t;
            graph.links[graph.links.length] = new_link;
        }
    }

    // 计算每个结点的 balance
    graph.nodes.forEach(function(d){
        d.balance = d.income-d.outcome;
    });
}

// main() 函数
function main(){
    console.log(graph);
    draw_graph(graph);
    timeline();
}

function timeline(){
    var global_width = $(window).width();
    var global_height = $(window).height();

    let data = [0, 1, 2, 3, 4, 5]

    var sliderFill = d3
        .sliderBottom()
        .min(d3.min(data))
        .max(d3.max(data))
        .width(0.5 * global_width)
        .tickFormat(d3.format(".2"))
        .ticks(10)
        .default(0.015)
        .fill("#2196f3")
        .on('onchange', timestamp => {
            // 显示/隐藏节点和边
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

d3.json('data/project.json').then(function(data){
    console.log(data);
    DATA = data;

    global_index = data.length;   // 先把全部的交易画出来 (因为和时间轴的交互还没有加)
    old_index = 0;

    addr2idx = {};   // 每个账户在 graph.nodes 中的对应索引
    graph = {"nodes":[],"links":[]};   // 以 nodes、links 的形式表示 graph

    get_graph(data);   // 将 .json 文件中的所有交易整理成一张图

    set_ui();
    main();
});