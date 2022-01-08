let data_path = "./data/bitcoin.json"

function findReceiver(data) {
	data.txs.sort((a, b) => a.time - b.time);

	let wallet = data.address;
	let receivers = {total: 0};

	for (tx of data.txs) {
		let money = 0;
		for (input of tx.inputs) {
			if(input.prev_out.addr == wallet) {
				money += input.prev_out.value;
			}
		}
		if(money != 0) {
			receivers.total += money;
			let recvers = {};
			let total = 0;
			tx.out.forEach((out) => {
				recvers[out.addr] = out.value;
				total += out.value;
			});
			for (let [addr, value] of Object.entries(recvers)) {
				if(recvers.hasOwnProperty(addr)) {
					let fraction = value / total * money;
					if(receivers.hasOwnProperty(addr)) {
						receivers[addr] += fraction;
					} else {
						receivers[addr] = fraction;
					}
				}
			}
		}
	}

	let receiversArr = [];
	for (let [key, val] of Object.entries(receivers)) {
		receiversArr.push({addr: key, value: val});
	}
	receiversArr.sort((a, b) => b.value - a.value);
	console.log(receiversArr);
	var json = JSON.stringify(receiversArr);
	console.log(json);
}

function main() {
	d3.json(data_path).then(function (data) {
		findReceiver(data);
	});
}

main();