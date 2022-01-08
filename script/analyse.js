let data_path = "./data/bitcoin.json";

function getISODate(d) {
    d = new Date(d * 1000);
    let year = d.getFullYear(),
        month = d.getMonth() + 1,
        day = d.getDate();
    let hour = d.getHours(),
        minute = d.getMinutes(),
        second = d.getSeconds();
    return (
        year +
        "-" +
        (month > 9 ? month : "0" + month) +
        "-" +
        (day > 9 ? day : "0" + day) +
        " " +
        (hour > 9 ? hour : "0" + hour) +
        ":" +
        (minute > 9 ? minute : "0" + minute) +
        ":" +
        (second > 9 ? second : "0" + second)
    );
}

function analyse(data) {
    data.txs.sort(function (a, b) {
        return a.time - b.time;
    });

    allAddr = new Set(); // 所有区块中涉及到的所有地址
    data.txs.forEach((tx) => {
        tx.inputs.forEach((input) => {
            allAddr.add(input.prev_out.addr);
        });
        tx.out.forEach((out) => {
            allAddr.add(out.addr);
        });
    });
    console.log(allAddr);
    console.log("The number of account: " + allAddr.size);

    allAccount = {}; // 用来存放每个账户的转入和转出
    for (addr of allAddr) {
        allAccount[addr] = { send: [], receive: [] };
    }
    data.txs.forEach((tx) => {
        tx.inputs.forEach((input) => {
            allAccount[input.prev_out.addr].send.push({
                time: tx.time,
                ISODate: getISODate(tx.time),
                value: input.prev_out.value,
            });
        });
        tx.out.forEach((out) => {
            allAccount[out.addr].receive.push({
                time: tx.time,
                ISODate: getISODate(tx.time),
                value: out.value,
            });
        });
    });
    console.log(allAccount[data.address]);

    // idx2tx = {};   // 通过每个区块的 tx_index 映射到对应交易
    // data.txs.forEach(tx => {
    //     idx2tx[tx.tx_index] = tx;
    // });
    // console.log(idx2tx);

    send = 0;
    // receiveT = 0,receiveF = 0;
    receive = 0;
    allAccount[data.address].send.forEach((x) => {
        send += x.value;
    });
    allAccount[data.address].receive.forEach((x) => {
        // if(x.spent)receiveT+=x.value;   // spent 为 true 的 receive
        // else receiveF+=x.value;   // spent 为 false 的 receive
        receive += x.value; // 总的 receive
    });
    console.log("总收益: " + receive);
    // console.log("Receive(not spent): "+receiveF);
    // console.log("Receive(spent): "+receiveT);
    console.log("总支出: " + send);
    console.log("总收益-总支出: " + (receive - send));
    console.log("Final balance: " + data.final_balance);
    console.log("Total received: " + data.total_received);
    console.log("Total sent: " + data.total_sent);

    // examine
    data.txs.forEach((tx) => {
        let in_flag = false;
        let out_flag = false;
        let flag = false;
        tx.inputs.forEach((input) => {
            if (input.prev_out.spending_outpoints[0].tx_index !== tx.tx_index) {
                in_flag = true;
            }
            if (input.prev_out.spending_outpoints.length !== 1) {
                flag = true;
            }
        });
        tx.out.forEach((out) => {
            if (out.tx_index !== tx.tx_index) {
                out_flag = true;
            }
        });
        console.log(flag, in_flag, out_flag);
    });
}

d3.json(data_path).then(function (data) {
    analyse(data);
});
