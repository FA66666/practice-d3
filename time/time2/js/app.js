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
});
