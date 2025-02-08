// 定义时间解析和格式化函数
var parseTime = d3.timeParse("%Y"),
  formatTime = d3.timeFormat("%Y");
var date = [];
var rowConverter = function (d) {
  var row = { year: d.year };
  date.push(d.year);
  for (var key in d) {
    if (key !== "year") {
      row[key] = d[key] ? +d[key] : 0;
    }
  }
  return row;
};

// 加载 CSV 数据（d3 v4 回调第一个参数为 error）
d3.csv("gdp_data_source.csv", rowConverter, function (error, dataset) {
  if (error) throw error;
  var time = date.sort((x, y) => new Date(x) - new Date(y)); //时间
  var keys = dataset.columns.slice(1); //国家

  // 构造每个国家的数据序列（每年的gdp）
  var seriesByCountry = {};
  keys.forEach(function (country) {
    seriesByCountry[country] = [];
  });

  var data = [];
  // 遍历每一年的数据，根据该年各国GDP计算动态排名
  dataset.forEach(function (d) {
    // 按照当年 GDP 升序排序（累计时较小的先叠加，保证最高的在图层上方）
    var ranking = keys.slice().sort(function (a, b) {
      return d[a] - d[b];
    });
    var cumulative = 0;
    ranking.forEach(function (country) {
      var value = d[country];
      seriesByCountry[country].push({
        name: country,
        date: parseInt(d.year),
        value: value,
      });
      data.push({ name: country, date: d.year, value: value });
    });
  });
  console.log(data);

  // data记录总数据

  // 计算每个国家总体GDP累计值，按从小到大排序
  var name_list = Object.keys(seriesByCountry);

  function dataSort() {
    currentData.sort(function (a, b) {
      if (Number(a.value) == Number(b.value)) {
        var r1 = 0;
        var r2 = 0;
        for (let index = 0; index < a.name.length; index++) {
          r1 = r1 + a.name.charCodeAt(index);
        }
        for (let index = 0; index < b.name.length; index++) {
          r2 = r2 + b.name.charCodeAt(index);
        }
        return r2 - r1;
      } else {
        return Number(a.value) - Number(b.value);
      }
    });
  }

  var baseTime = 3600;

  // 选择颜色完毕

  var interval_time = config.interval_time;
  var text_y = config.text_y;
  // var typeLabel = config.typeLabel;
  // 长度小于display_barInfo的bar将不显示barInfo
  // var display_barInfo = config.display_barInfo;

  // 每个数据的间隔日期
  var step = config.step;
  var long = config.long;
  var format = config.format;
  var left_margin = config.left_margin;
  var right_margin = config.right_margin;
  var top_margin = config.top_margin;
  var bottom_margin = config.bottom_margin;
  var timeFormat = config.timeFormat;
  var item_x = config.item_x;
  var max_number = config.max_number;
  var text_x = config.text_x;
  var deformat = config.deformat;
  const margin = {
    left: left_margin,
    right: right_margin,
    top: top_margin,
    bottom: bottom_margin,
  };
  var background_color = config.background_color;

  d3.select("body").attr("style", "background:" + background_color);

  interval_time /= 3;
  var lastData = [];
  var currentdate = time[0].toString();
  var currentData = [];
  var lastname;

  const width = 1900;

  const height = 1060;

  var svg = d3
    .select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom - 32;
  const xValue = (d) => Number(d.value);
  const yValue = (d) => d.name;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  const xAxisG = g
    .append("g")
    .attr("transform", `translate(0, ${innerHeight})`);
  const yAxisG = g.append("g");

  xAxisG
    .append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", 100);

  var xScale = d3.scaleLinear();

  const yScale = d3.scaleBand().paddingInner(0.3).paddingOuter(0);

  const xTicks = 10;
  const xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(xTicks)
    .tickPadding(20)
    .tickFormat((d) => {
      if (d <= 0) {
        return "";
      }
      return d;
    })
    .tickSize(-innerHeight);

  const yAxis = d3
    .axisLeft()
    .scale(yScale)
    .tickPadding(5)
    .tickSize(-innerWidth);

  var dateLabel_switch = config.dateLabel_switch;
  //dateLabel位置
  var dateLabel_x = config.dateLabel_x;
  var dateLabel_y = config.dateLabel_y;

  var dateLabel = g
    .insert("text")
    .data(currentdate)
    .attr("class", "dateLabel")
    .attr("style:visibility", dateLabel_switch)
    .attr("x", dateLabel_x)
    .attr("y", dateLabel_y)
    .attr("text-anchor", function () {
      return "end";
    })
    .text(currentdate);

  var topLabel = g
    .insert("text")
    .attr("class", "topLabel")
    .attr("x", item_x)
    .attr("y", text_y);

  let rate = [];
  function getCurrentData(date) {
    rate = [];
    currentData = [];
    data.forEach((element) => {
      if (element["date"] == date && parseFloat(element["value"]) != 0) {
        tail = "";
        element.name = element.name.slice(0, config.bar_name_max - 1) + tail;
        currentData.push(element);
      }
    });

    // 按照 GDP 值从大到小排序
    currentData.sort((a, b) => b.value - a.value);

    // 只保留前十个国家
    currentData = currentData.slice(0, 10);

    rate["MAX_RATE"] = 0;
    rate["MIN_RATE"] = 1;
    currentData.forEach((e) => {
      _cName = e.name;
      lastData.forEach((el) => {
        if (el.name == e.name) {
          rate[e.name] = Number(Number(e.value) - Number(el.value));
        }
      });
      if (rate[e.name] == undefined) {
        rate[e.name] = rate["MIN_RATE"];
      }
      if (rate[e.name] > rate["MAX_RATE"]) {
        rate["MAX_RATE"] = rate[e.name];
      } else if (rate[e.name] < rate["MIN_RATE"]) {
        rate["MIN_RATE"] = rate[e.name];
      }
    });

    console.log(currentData);

    d3.transition("2").each(redraw).each(change);
    lastData = currentData;
    console.log(currentData);
  }

  var lastname;
  var counter = {
    value: 1,
  };

  var avg = 0;

  function redraw() {
    if (currentData.length == 0) return;

    xScale
      .domain([0, d3.max(currentData, xValue) * 1.15])
      .range([0, innerWidth]);

    dateLabel
      .data(currentData)
      .transition()
      .duration(baseTime * interval_time)
      .ease(d3.easeLinear)
      .tween("text", function (d) {
        var self = this;
        var i = d3.interpolateDate(
          new Date(self.textContent),
          new Date(d.date)
        );
        return function (t) {
          var dateformat = d3.timeFormat(timeFormat);
          self.textContent = dateformat(i(t));
        };
      });

    xAxisG
      .transition()
      .duration(baseTime * interval_time)
      .ease(d3.easeLinear)
      .call(xAxis);
    yAxisG
      .transition()
      .duration(baseTime * interval_time)
      .ease(d3.easeLinear)
      .call(yAxis);

    yAxisG.selectAll(".tick").remove();

    yScale
      .domain(currentData.map((d) => d.name).reverse())
      .range([innerHeight, 0]);

    var bar = g.selectAll(".bar").data(currentData, function (d) {
      return d.name;
    });

    var barEnter = bar
      .enter()
      .insert("g", ".axis")
      .attr("class", "bar")
      .attr("transform", function (d) {
        return "translate(0," + yScale(yValue(d)) + ")";
      });

    barEnter
      .append("rect")
      .attr("width", function (d) {
        return xScale(currentData[currentData.length - 1].value);
      })
      .attr("fill-opacity", 0)
      .attr("height", 26)
      .attr("y", 50)
      .style("fill", "green")
      .transition("a")
      .delay(500 * interval_time)
      .duration(3500 * interval_time)
      .attr("y", 0)
      .attr("width", (d) => xScale(xValue(d)))
      .attr("fill-opacity", 1);

    barEnter
      .append("text")
      .attr("y", 50)
      .attr("fill-opacity", 0)
      .style("fill", "green")
      .transition("2")
      .delay(500 * interval_time)
      .duration(3500 * interval_time)
      .attr("fill-opacity", 1)
      .attr("y", 0)
      .attr("class", function (d) {
        return "label ";
      })
      .attr("x", config.labelx)
      .attr("y", 20)
      .attr("text-anchor", "end")
      .text(function (d) {
        return d.name;
      });

    barEnter
      .append("text")
      .attr("x", function () {
        return xScale(currentData[currentData.length - 1].value);
      })
      .attr("y", 50)
      .attr("fill-opacity", 0)
      .style("fill", "green")
      .transition()
      .duration(3500 * interval_time)
      .tween("text", function (d) {
        var self = this;
        // 初始值为d.value的0.9倍
        self.textContent = d.value * 0.9;
        var i = d3.interpolate(self.textContent, Number(d.value)),
          prec = (Number(d.value) + "").split("."),
          round = prec.length > 1 ? Math.pow(10, prec[1].length) : 1;
        return function (t) {
          self.textContent =
            d3.format(format)(Math.round(i(t) * round) / round) +
            config.postfix;
        };
      })
      .attr("fill-opacity", 1)
      .attr("y", 0)
      .attr("class", function (d) {
        return "value";
      })
      .attr("x", (d) => {
        return xScale(xValue(d)) + 10;
      })
      .attr("y", 22);

    //条形更新
    var barUpdate = bar
      .transition("2")
      .duration(3500 * interval_time)
      .ease(d3.easeLinear);

    barUpdate
      .select("rect")
      .style("fill", "black")
      .attr("width", (d) => xScale(xValue(d)));
    barUpdate
      .select(".label")
      .attr("class", function (d) {
        return "label ";
      })
      .style("fill", "black")
      .attr("width", (d) => xScale(xValue(d)));

    barUpdate
      .select(".value")
      .attr("class", function (d) {
        return "value";
      })
      .style("fill", "black")
      .attr("width", (d) => xScale(xValue(d / 10)));

    barUpdate
      .select(".value")
      .tween("text", function (d) {
        var self = this;

        var i = d3.interpolate(self.textContent, Number(d.value));

        var i = d3.interpolate(
          deformat(self.textContent, config.postfix),
          Number(d.value)
        );

        var prec = (Number(d.value / 10000) + "").split("."),
          round = prec.length > 1 ? Math.pow(10, prec[1].length) : 1;
        return function (t) {
          self.textContent =
            d3.format(format)(Math.round(i(t) * round) / round) +
            config.postfix;
        };
      })
      .duration(3500 * interval_time)
      .attr("x", (d) => xScale(xValue(d)) + 10);

    avg =
      (Number(currentData[0]["value"]) +
        Number(currentData[currentData.length - 1]["value"])) /
      2;
    //条形更新结束

    // 条形退出
    var barExit = bar
      .exit()
      .attr("fill-opacity", 1)
      .transition()
      .duration(3500 * interval_time);
    barExit
      .attr("transform", function (d) {
        return "translate(0," + "1000" + ")";
      })
      .remove()
      .attr("fill-opacity", 0);
    barExit
      .select("rect")
      .attr("fill-opacity", 0)
      .style("fill", "red")
      .attr("width", xScale(currentData[currentData.length - 1]["value"]));

    barExit
      .select(".value")
      .attr("fill-opacity", 0)
      .attr("x", () => {
        return xScale(currentData[currentData.length - 1]["value"]);
      });
  }

  function change() {
    yScale
      .domain(currentData.map((d) => d.name).reverse())
      .range([innerHeight, 0]);

    g.selectAll(".bar")
      .data(currentData, function (d) {
        return d.name;
      })
      .transition("1")
      .duration(baseTime * update_rate * interval_time)
      .attr("transform", function (d) {
        return "translate(0," + yScale(yValue(d)) + ")";
      });
  }

  var i = 0;
  var p = config.wait - 2;
  var update_rate = config.update_rate;
  var inter = setInterval(function next() {
    // 空过p回合
    while (p) {
      p -= 1;
      return;
    }
    currentdate = time[i];
    getCurrentData(time[i]);
    i++;

    if (i >= time.length) {
      window.clearInterval(inter);
    }
  }, baseTime * interval_time);
});
