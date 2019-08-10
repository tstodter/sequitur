import * as d3 from 'd3';
import * as R from 'ramda';

const viewBox = ({minX, minY, width, height}) => `${minX} ${minY} ${width} ${height}`;

const width = 975;

const svg = d3.select('body')
  .append('svg')
  .attr('width', width)
  .attr('height', 33)
  .attr('viewBox', viewBox({minX: 0, minY: -20, width, height: 33}));

svg.selectAll('text')
  .data(randomLetters())
  .join('text')
  .attr('x', (_, i) => i * 16)
  .text(d => d);

function randomLetters() {
  return d3.shuffle('abcdefghijklmnopqrstuvwxyz'.split(''))
    .slice(0, Math.floor(6 + Math.random() * 20))
    .sort();
}