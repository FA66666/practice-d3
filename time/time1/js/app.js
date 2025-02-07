// 定义画布尺寸和边距
var w = 1400,
  h = 700,
  padding = 20;
// 为图例和返回按钮预留底部空间
var paddingBottom = 60;

// 定义时间解析和格式化函数
var parseTime = d3.timeParse("%Y"),
  formatTime = d3.timeFormat("%Y");

// rowConverter：将 year 转换为 Date 类型，其它字段转换为数字
var rowConverter = function (d) {
  var row = { year: parseTime(d.year) };
  for (var key in d) {
    if (key !== "year") {
      row[key] = d[key] ? +d[key] : 0;
    }
  }
  return row;
};

// 创建 SVG 画布（增加底部空间）
var svg = d3
  .select("body")
  .append("svg")
  .attr("width", w)
  .attr("height", h + paddingBottom);

// 创建自定义 tooltip（初始隐藏）
var tooltip = d3.select("body").append("div").attr("class", "tooltip");

// 加载 CSV 数据（d3 v4 回调第一个参数为 error）
d3.csv("gdp_data_source.csv", rowConverter, function (error, dataset) {
  if (error) throw error;

  // 提取所有国家名称（去除 year 列）
  var keys = dataset.columns.slice(1);

  // 计算所有年份的总GDP最大值，用于 yScale 的 domain
  var maxTotal = d3.max(dataset, function (d) {
    var total = 0;
    keys.forEach(function (k) {
      total += d[k];
    });
    return total;
  });

  // 构造每个国家的数据序列
  var seriesByCountry = {};
  keys.forEach(function (country) {
    seriesByCountry[country] = [];
  });

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
        year: d.year,
        value: value,
        y0: cumulative,
        y1: cumulative + value,
      });
      cumulative += value;
    });
  });

  // 计算每个国家总体GDP累计值，按从小到大排序（较小的先绘制）
  var countries = Object.keys(seriesByCountry);
  countries.sort(function (a, b) {
    var totalA = d3.sum(seriesByCountry[a], function (d) {
      return d.value;
    });
    var totalB = d3.sum(seriesByCountry[b], function (d) {
      return d.value;
    });
    return totalA - totalB;
  });

  // 定义比例尺
  var xScale = d3
    .scaleTime()
    .domain(
      d3.extent(dataset, function (d) {
        return d.year;
      })
    )
    .range([padding, w - padding * 2]);

  var yScale = d3
    .scaleLinear()
    .domain([0, maxTotal])
    .range([h - padding, padding / 2])
    .nice();

  // 定义坐标轴
  var xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(formatTime);

  var yAxis = d3.axisRight(yScale).ticks(5);

  // 定义 area 生成器
  var area = d3
    .area()
    .x(function (d) {
      return xScale(d.year);
    })
    .y0(function (d) {
      return yScale(d.y0);
    })
    .y1(function (d) {
      return yScale(d.y1);
    });

  // 绘制每个国家的面积图，并添加交互事件（包括 tooltip 显示和顶部说明更新）
  var areas = svg
    .selectAll(".area")
    .data(countries)
    .enter()
    .append("path")
    .attr("class", "area")
    .attr("d", function (country) {
      return area(seriesByCountry[country]);
    })
    .attr("fill", function (d, i) {
      return d3.schemeCategory10[i % 10];
    })
    .attr("opacity", 0.9)
    // 鼠标悬停：高亮当前区域，其它区域变灰，并显示 tooltip
    .on("mouseover", function (country) {
      d3.selectAll(".area")
        .transition()
        .duration(200)
        .attr("fill", "lightgray")
        .attr("opacity", 0.5);
      d3.select(this)
        .transition()
        .duration(200)
        .attr("fill", "red")
        .attr("opacity", 1);
      tooltip.style("opacity", 1);
    })
    // 鼠标移动时，根据鼠标位置更新 tooltip 内容
    .on("mousemove", function (country) {
      var mouse = d3.mouse(this),
        x0 = xScale.invert(mouse[0]),
        bisect = d3.bisector(function (d) {
          return d.year;
        }).left,
        dataArr = seriesByCountry[country],
        index = bisect(dataArr, x0);
      if (index >= dataArr.length) {
        index = dataArr.length - 1;
      }
      var d0 = dataArr[index];
      tooltip
        .html(
          "国家: " +
            country +
            "<br>年份: " +
            formatTime(d0.year) +
            "<br>GDP: " +
            d0.value
        )
        .style("left", d3.event.pageX + 10 + "px")
        .style("top", d3.event.pageY - 30 + "px");
    })
    // 鼠标移出时，恢复所有区域颜色，并隐藏 tooltip
    .on("mouseout", function (country) {
      d3.selectAll(".area")
        .transition()
        .duration(200)
        .attr("fill", function (d, i) {
          return d3.schemeCategory10[i % 10];
        })
        .attr("opacity", 0.9);
      tooltip.style("opacity", 0);
    })
    // 点击事件：只显示被点击国家，隐藏其它区域和图例，同时更新顶部说明
    .on("click", function (country) {
      d3.event.stopPropagation();
      svg
        .selectAll(".area")
        .filter(function (d) {
          return d !== country;
        })
        .transition()
        .duration(200)
        .style("display", "none");
      legend.style("display", "none");
      // 更新顶部说明
      d3.select("#currentCountry").text("当前国家为：" + country);
      // 若页面中不存在返回按钮，则添加
      if (d3.select("#returnBtn").empty()) {
        d3.select("body")
          .append("button")
          .attr("id", "returnBtn")
          .text("返回")
          .on("click", function () {
            svg
              .selectAll(".area")
              .transition()
              .duration(200)
              .style("display", "block");
            legend.style("display", "block");
            d3.select(this).remove();
            // 恢复顶部说明为默认
            d3.select("#currentCountry").text("当前国家为：");
          });
      }
    })
    .append("title")
    .text(function (d) {
      return d;
    });

  // 添加 X 轴（底部）
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + (h - padding) + ")")
    .call(xAxis);

  // 添加 Y 轴（右侧）
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + padding + ",0)")
    .call(yAxis);

  // ------------------------------
  // 添加底部图例（国旗+国家名称），仅显示 2016 年 GDP 前 12 国
  // ------------------------------
  var latestYearData = dataset[dataset.length - 1];
  var ranking2016 = keys
    .slice()
    .sort(function (a, b) {
      return latestYearData[b] - latestYearData[a];
    })
    .slice(0, 12);

  var legendHeight = 20,
    legendPadding = 5,
    legendWidth = (w - 2 * padding) / ranking2016.length;

  var legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", "translate(" + padding + "," + (h + 10) + ")");

  // 使用 image 替换原来的 rect，显示国旗
  legend
    .selectAll("image")
    .data(ranking2016)
    .enter()
    .append("image")
    .attr("x", function (d, i) {
      return i * legendWidth;
    })
    .attr("width", legendWidth - legendPadding)
    .attr("height", legendHeight)
    .attr("xlink:href", function (d) {
      // 请确保 "flags" 文件夹中存在对应国家名称的小写 png 文件，如 "usa.png"
      return "flags/" + d + ".png";
    })
    .on("mouseover", function (country) {
      d3.selectAll(".area")
        .transition()
        .duration(200)
        .attr("fill", "lightgray")
        .attr("opacity", 0.5);
      svg
        .selectAll(".area")
        .filter(function (d) {
          return d === country;
        })
        .transition()
        .duration(200)
        .attr("fill", "red")
        .attr("opacity", 1);
    })
    .on("mouseout", function () {
      d3.selectAll(".area")
        .transition()
        .duration(200)
        .attr("fill", function (d, i) {
          return d3.schemeCategory10[i % 10];
        })
        .attr("opacity", 0.9);
    });

  // 添加国家名称文本到图例
  legend
    .selectAll("text")
    .data(ranking2016)
    .enter()
    .append("text")
    .attr("x", function (d, i) {
      return i * legendWidth + (legendWidth - legendPadding) / 2;
    })
    .attr("y", legendHeight + 16)
    .attr("text-anchor", "middle")
    .text(function (d) {
      return d;
    });
});
