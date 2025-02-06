// 定义画布尺寸和边距
var w = 1400;
var h = 700;
var padding = 20;

// 定义时间解析和格式化函数
var parseTime = d3.timeParse("%Y");
var formatTime = d3.timeFormat("%Y");

// rowConverter：将 year 转换为 Date 类型，其它字段转换为数字
var rowConverter = function (d) {
  var row = { year: parseTime(d.year) };
  for (var key in d) {
    if (key !== "year") {
      row[key] = d[key] ? +d[key] : 0; //字段转换为数字
    }
  }
  return row;
};

// 加载 CSV 数据
d3.csv("../gdp_data_source.csv", rowConverter, function (dataset) {
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

  // 构造每个国家的数据序列，每个数据点记录当年的 GDP、y0 和 y1（基于当年排名计算）
  var seriesByCountry = {};
  keys.forEach(function (country) {
    seriesByCountry[country] = [];
  });

  // 遍历每一年的数据，根据该年各国GDP计算动态排名
  dataset.forEach(function (d) {
    // 按照当年 GDP 降序排序（生成新的数组，不改变原 keys 顺序）
    var ranking = keys.slice().sort(function (a, b) {
      return d[a] - d[b];
    });
    // 累计计算：从 0 开始依次叠加每个国家的 GDP
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

  // 为保证数据最大的国家显示在最上层，
  // 计算每个国家的总体 GDP 累计值，然后排序：
  var countries = Object.keys(seriesByCountry);
  countries.sort(function (a, b) {
    var totalA = d3.sum(seriesByCountry[a], function (d) {
      return d.value;
    });
    var totalB = d3.sum(seriesByCountry[b], function (d) {
      return d.value;
    });
    // 按从小到大排序，较小的先绘制，较大的后绘制，从而在图层上位于上层
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

  // 创建 SVG 画布
  var svg = d3.select("body").append("svg").attr("width", w).attr("height", h);

  // 定义 area 生成器，使用动态计算的 y0 和 y1 绘制路径
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

  // 绘制每个国家的面积图，按照计算后的 countries 顺序绘制，
  // 这样总体 GDP 较小的国家先绘制，较大的国家后绘制（显示在上层）
  svg
    .selectAll(".area")
    .data(countries)
    .enter()
    .append("path")
    .attr("class", "area")
    .attr("d", function (country) {
      return area(seriesByCountry[country]);
    })
    .attr("fill", function (d, i) {
      return d3.schemeCategory10[i % 10]; // 采用 D3 默认配色
    })
    .attr("opacity", 0.9) // 默认透明度
    .on("mouseover", function (event, country) {
      // 鼠标悬停时：
      svg
        .selectAll(".area")
        .transition()
        .duration(200) // 200ms 动画
        .attr("fill", "lightgray") // 变灰
        .attr("opacity", 0.5); // 提高透明度

      d3.select(this)
        .transition()
        .duration(200)
        .attr("fill", "red") // 目标国家变红
        .attr("opacity", 1); // 变得更明显
    })
    .on("mouseout", function () {
      // 鼠标离开时恢复原始颜色
      svg
        .selectAll(".area")
        .transition()
        .duration(200)
        .attr("fill", function (d, i) {
          return d3.schemeCategory10[i % 10];
        })
        .attr("opacity", 0.9);
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

  // 添加 Y 轴（右侧，向左平移一定距离）
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + padding + ",0)")
    .call(yAxis);

  // 额外增加底部空间，确保 X 轴和图例不会重叠
  var paddingBottom = 50;
  var newHeight = h + paddingBottom; // 让画布变大，给图例留出空间
  svg.attr("height", newHeight);

  // 计算 2016 年 GDP 排名前 12 名的国家
  var latestYearData = dataset[dataset.length - 1]; // 取最后一年（2016）
  var ranking2016 = keys
    .slice()
    .sort((a, b) => latestYearData[b] - latestYearData[a])
    .slice(0, 12); // 取前 12 名

  // 图例的高度和间距
  var legendHeight = 20;
  var legendPadding = 5;
  var legendWidth = (w - 2 * padding) / ranking2016.length; // 让图例均匀分布

  // **调整图例位置到 X 轴下方**
  var legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", "translate(" + padding + "," + (h + 10) + ")"); // **向下移动 10px，避免遮挡**

  // 添加标注
  svg
    .selectAll(".label")
    .data(ranking2016)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", w - padding * 2 + 5) // 右侧对齐
    .attr("y", function (d) {
      var lastDataPoint = seriesByCountry[d][seriesByCountry[d].length - 1]; // 取 2016 年的数据
      return yScale(lastDataPoint.y1 - lastDataPoint.value / 2); // 计算中间位置
    })
    .text(function (d) {
      return d;
    }) // 显示国家名称
    .attr("font-size", "12px")
    .attr("fill", "black")
    .attr("alignment-baseline", "middle");
});
