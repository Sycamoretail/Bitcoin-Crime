# 初步的架构

## 数据
{时间、发者、收者、值}，按照时间排序的json array

## Vertex
- global_index: 当前时间在数据json中的索引，每次时间改变只需要增加这个索引即可
- balance, income, outcome: 截止当前时间的余额、总收益、总支出
- address: 钱包地址
- transactions: 截止当前时间和这个钱包有关的交易，从数据中读取和自己有关的{时间、发者、收者、值}，然后增加 global_index 直到目前时间
- input_queue, output_map: 提供染色信息的FIFO队列和对象，每次从数据中读取一条交易`{time, tx, rx, value}`，更新二者之一：
	- 读取数据为收钱，则`input_queue.push({src = tx, val = value})`
	- 读取数据为发钱，则
	```py
	while value > 0:
		head = input_queue.top()
		if head.val > value:
			input_queue.top() -= value
			output_map[head.src].rx += value
			value = 0
		else:
			value -= head.val
			input_queue.pop()
			output_map[head.src].rx += head.val
	```

## Edge
- global_index
- from, to: 边连接的两个节点地址
- totol: 截止当前时间从from 发向to 的所有交易总额
- transactions: 截止当前时间从from 发向to 的所有交易{time, value}。每次时间向前变化时，从数据中读取从from 到to的交易并增加total，然后增加 global_index 直到目前时间

## 染色
点击受害者，可以显示受害者钱财流向，当前节点为v（从涉事钱包开始），算法为
```py
def profile(v, src, val):
	'''
	v: 当前节点
	src, val: 当前节点从src 节点拿了val钱
	'''
	for (dst_i, val_i) in v.output_map[src]:
		out_val = val * (val_i)/sum(val_j) # 流向dst_i的钱为val * (val_i)/sum(val_j)
		color(dst_i, out_val)
		profile(dst_i, v, out_val)
```