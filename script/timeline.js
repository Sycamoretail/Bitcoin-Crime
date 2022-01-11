var global_width = $(window).width();
var global_height = $(window).height();

data = [0, 1, 2, 3, 4, 5]

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
		
	})

var gFill = d3
    .select("#timeline")
    .append("svg")
    .attr("width", global_width)
    .attr("height", 0.15 * global_height)
    .append("g")
    .attr("transform", "translate(300,30)")

gFill.call(sliderFill);