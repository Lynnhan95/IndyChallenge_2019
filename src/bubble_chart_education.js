function bubbleChart2() {
    // Constants for sizing
    var width = 900;
    var height = 540;
  
    // tooltip for mouseover functionality
    var tooltip = floatingTooltip('gates_tooltip', 100);
  
    // Locations to move bubbles towards, depending
    // on which view mode is selected.
    var center = { x: width / 2, y: height / 2 };
  
      var yearCenters = {
        "0-6.9": { x: width / 3, y: height / 2 },
        "7.0-13.9": { x: width / 2, y: height / 2 },
        "14.0-21.0": { x: 2 * width / 3, y: height / 2 }
      };
    
      // X locations of the year titles.
      var yearsTitleX = {
        "0-6.9": 160,
        "7.0-13.9": width / 2,
        "14.0-21.0": width - 160
      };
  
  
    // Used when setting up force and
    // moving around nodes
    var damper = 0.102;
  
    // These will be set in create_nodes and create_vis
    var svg = null;
    var bubbles = null;
    var nodes = [];
  
    // Charge function that is called for each node.
    // Charge is proportional to the diameter of the
    // circle (which is stored in the radius attribute
    // of the circle's associated data.
    // This is done to allow for accurate collision
    // detection with nodes of different sizes.
    // Charge is negative because we want nodes to repel.
    // Dividing by 8 scales down the charge to be
    // appropriate for the visualization dimensions.
    function charge(d) {
      return -Math.pow(d.radius, 2.0) / 8;
    }
  
    // Here we create a force layout and
    // configure it to use the charge function
    // from above. This also sets some contants
    // to specify how the force layout should behave.
    // More configuration is done below.
    var force = d3.layout.force()
      .size([width, height])
      .charge(charge)
      .gravity(-0.01)
      .friction(0.9);
  
    // Nice looking colors - no reason to buck the trend
    var fillColor = d3.scale.ordinal()
      .domain(['low', 'medium', 'high'])
      .range(['#A8BD63', '#FFD26A', '#d84b2a',]);
  
    // Sizes bubbles based on their area instead of raw radius
    var radiusScale = d3.scale.pow()
      .exponent(0.5)
      .range([2, 85]);
  
    /*
     * This data manipulation function takes the raw data from
     * the CSV file and converts it into an array of node objects.
     * Each node will store data and visualization values to visualize
     * a bubble.
     *
     * rawData is expected to be an array of data objects, read in from
     * one of d3's loading functions like d3.csv.
     *
     * This function returns the new node array, with a node in that
     * array for each element in the rawData input.
     */
    function createNodes(rawData) {
      // Use map() to convert raw data into node data.
      // Checkout http://learnjsdata.com/ for more on
      // working with data.
      console.log('rawData:', rawData)
      var myNodes = rawData.map(function (d) {
        return {
          id: d.id,
          radius: radiusScale(+d.total_amount),
          value: d.total_amount,
          name: d.county_name,
          group: d.group,
          year: d.year,
          x: Math.random() * 900,
          y: Math.random() * 800
        };
      });
  
      // sort them to prevent occlusion of smaller nodes.
      myNodes.sort(function (a, b) { return b.value - a.value; });
      console.log(myNodes)
      return myNodes;
    }
  
    /*
     * Main entry point to the bubble chart. This function is returned
     * by the parent closure. It prepares the rawData for visualization
     * and adds an svg element to the provided selector and starts the
     * visualization creation process.
     *
     * selector is expected to be a DOM element or CSS selector that
     * points to the parent element of the bubble chart. Inside this
     * element, the code will add the SVG continer for the visualization.
     *
     * rawData is expected to be an array of data objects as provided by
     * a d3 loading function like d3.csv.
     */
    var chart = function chart(selector, rawData) {
      // Use the max total_amount in the data as the max in the scale's domain
      // note we have to ensure the total_amount is a number by converting it
      // with `+`.
      var maxAmount = d3.max(rawData, function (d) { return +d.total_amount; });
      radiusScale.domain([0, maxAmount]);
  
      nodes = createNodes(rawData);
      // Set the force's nodes to our newly created nodes array.
      force.nodes(nodes);
  
      // Create a SVG element inside the provided selector
      // with desired size.
      svg = d3.select(selector)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
  
      // Bind nodes data to what will become DOM elements to represent them.
      bubbles = svg.selectAll('.bubble')
        .data(nodes, function (d) { return d.id; });
  
      // Create new circle elements each with class `bubble`.
      // There will be one circle.bubble for each object in the nodes array.
      // Initially, their radius (r attribute) will be 0.
      bubbles.enter().append('circle')
        .classed('bubble', true)
        .attr('r', 0)
        .attr('id',function(d){return d.name})
        .attr('fill', function (d) { return fillColor(d.group); })
        .attr('opacity', 0.75)
        .attr('stroke', function (d) { return d3.rgb(fillColor(d.group)).darker(); })
        .attr('stroke-width', 2)
        .on('mouseover', showDetail)
        .on('click', showID)
        .on('mouseout', hideDetail);
  
      // Fancy transition to make bubbles appear, ending with the
      // correct radius
      bubbles.transition()
        .duration(2000)
        .attr('r', function (d) { return d.radius; });
  
      // Set initial layout to single group.
      groupBubbles();
    };
  
    /*
     * Sets visualization in "single group mode".
     * The year labels are hidden and the force layout
     * tick function is set to move all nodes to the
     * center of the visualization.
     */
    function groupBubbles() {
      hideYears();
  
      force.on('tick', function (e) {
        bubbles.each(moveToCenter(e.alpha))
          .attr('cx', function (d) { return d.x; })
          .attr('cy', function (d) { return d.y; });
      });
  
      force.start();
    }
  
    /*
     * Helper function for "single group mode".
     * Returns a function that takes the data for a
     * single node and adjusts the position values
     * of that node to move it toward the center of
     * the visualization.
     *
     * Positioning is adjusted by the force layout's
     * alpha parameter which gets smaller and smaller as
     * the force layout runs. This makes the impact of
     * this moving get reduced as each node gets closer to
     * its destination, and so allows other forces like the
     * node's charge force to also impact final location.
     */
    function moveToCenter(alpha) {
      return function (d) {
        d.x = d.x + (center.x - d.x) * damper * alpha;
        d.y = d.y + (center.y - d.y) * damper * alpha;
      };
    }
  
    /*
     * Sets visualization in "split by year mode".
     * The year labels are shown and the force layout
     * tick function is set to move nodes to the
     * yearCenter of their data's year.
     */
    function splitBubbles() {
      showYears();
  
      force.on('tick', function (e) {
        bubbles.each(moveToYears(e.alpha))
          .attr('cx', function (d) { return d.x; })
          .attr('cy', function (d) { return d.y; });
      });
  
      force.start();
    }
  
    /*
     * Helper function for "split by year mode".
     * Returns a function that takes the data for a
     * single node and adjusts the position values
     * of that node to move it the year center for that
     * node.
     *
     * Positioning is adjusted by the force layout's
     * alpha parameter which gets smaller and smaller as
     * the force layout runs. This makes the impact of
     * this moving get reduced as each node gets closer to
     * its destination, and so allows other forces like the
     * node's charge force to also impact final location.
     */
    function moveToYears(alpha) {
      return function (d) {
        var target = yearCenters[d.year];
        d.x = d.x + (target.x - d.x) * damper * alpha * 1.1;
        d.y = d.y + (target.y - d.y) * damper * alpha * 1.1;
      };
    }
  
    /*
     * Hides Year title displays.
     */
    function hideYears() {
      svg.selectAll('.year').remove();
    }
  
    /*
     * Shows Year title displays.
     */
    function showYears() {
      // Another way to do this would be to create
      // the year texts once and then just hide them.
      var yearsData = d3.keys(yearsTitleX);
      var years = svg.selectAll('.year')
        .data(yearsData);
  
      years.enter().append('text')
        .attr('class', 'year')
        .attr('x', function (d) { return yearsTitleX[d]; })
        .attr('y', 40)
        .attr('text-anchor', 'middle')
        .text(function (d) { return d; });
    }
  
    /*
     * Function called on mouseover to display the
     * details of a bubble in the tooltip.
     */
    function showDetail(d) {
      // change outline to indicate hover state.
      d3.select(this).attr('stroke', 'black')
                     .style('cursor','pointer')
      
      var content = '<span class="name">County: </span><span class="value">' +
                    d.name+
                    '</span><br>' 
                    +'<span class="name">Population: </span><span class="value">' +
                    addCommas(d.value) +
                    '</span><br>' +
                    '<span class="name">Percentage: </span><span class="value">' +
                    d.year +
                    '</span><br>'
                    +'<span class="name">Suspicious/Level: </span><span class="value">' +
                    d.group +
                    '</span><br>';
      tooltip.showTooltip(content, d3.event);
  
      //show ID
      const selectedNode = d3.select(this)
      console.log(selectedNode[0][0].id)
    }
  
    function showID(d){
      const selectedNode = d3.select(this)
      console.log(selectedNode[0][0].id)
    }
  
    /*
     * Hides tooltip
     */
    function hideDetail(d) {
      // reset outline
      d3.select(this)
        .attr('stroke', d3.rgb(fillColor(d.group)).darker());
  
      tooltip.hideTooltip();
    }
  
    /*
     * Externally accessible function (this is attached to the
     * returned chart function). Allows the visualization to toggle
     * between "single group" and "split by year" modes.
     *
     * displayName is expected to be a string and either 'year' or 'all'.
     */
    chart.toggleDisplay = function (displayName) {
      if (displayName === 'year') {
        splitBubbles();
      } else {
        groupBubbles();
      }
    };
  
    // return the chart function from closure.
    return chart;
}

var myBubbleChart2 = bubbleChart2()


function display2(error, data) {
    if (error) {
      console.log(error);
    }
  
    // myBubbleChart('#vis1', data);
    myBubbleChart2('#vis2', data);
  }

function setupButtons2() {
d3.select('#toolbar2')
    .selectAll('.button2')
    .on('click', function () {
    // Remove active class from all buttons
    d3.selectAll('.button2').classed('active', false);
    // Find the button just clicked
    var button = d3.select(this);

    // Set it as the active button
    button.classed('active', true);

    // Get the id of the button
    var buttonId = button.attr('id');

    // Toggle the bubble chart based on
    // the currently clicked button.
    console.log(buttonId)
    myBubbleChart2.toggleDisplay(buttonId);
    });
}

d3.csv('data/indiana_education.csv', display2);

setupButtons2();