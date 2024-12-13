import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { fetchSleepData } from '../services/api';

const WorldGlobe = () => {
  const svgRef = useRef(null);
  const [selectedMetric, setSelectedMetric] = useState('avgSleep');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [rotation, setRotation] = useState([0, 0, 0]);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef(null);
  const [sleepData, setSleepData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const countryIdToCode = new Map([
    ['840', 'USA'], // United States
    ['826', 'GBR'], // United Kingdom
    ['392', 'JPN'], // Japan
    ['276', 'DEU'], // Germany
    ['250', 'FRA'], // France
    ['380', 'ITA'], // Italy
    ['724', 'ESP'], // Spain
    ['124', 'CAN'], // Canada
    ['036', 'AUS'], // Australia
    ['554', 'NZL'], // New Zealand
    ['156', 'CHN'], // China
    ['356', 'IND'], // India
    ['076', 'BRA'], // Brazil
    ['032', 'ARG'], // Argentina
    ['710', 'ZAF'], // South Africa
    ['643', 'RUS'], // Russia
    ['410', 'KOR'], // South Korea
    ['484', 'MEX'], // Mexico
    ['682', 'SAU'], // Saudi Arabia
    ['818', 'EGY'], // Egypt
    ['807', 'MKD'], // Macedonia
    ['688', 'SRB'], // Serbia
    ['499', 'MNE'], // Montenegro
    ['780', 'TTO'], // Trinidad and Tobago
    ['728', 'SSD'], // South Sudan
  ]);

  const getColor = (value) => {
    if (!value) return '#ccc';
    
    if (selectedMetric === 'avgSleep') {
      const normalized = (value - 6) / 3;
      return d3.interpolateRdYlBu(normalized);
    } else if (selectedMetric === 'insomnia') {
      const normalized = value / 40;
      return d3.interpolateYlOrRd(normalized);
    } else {
      const normalized = value / 10;
      return d3.interpolateViridis(normalized);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchSleepData();
        console.log('Sleep data loaded:', data);
        if (data) {
          setSleepData(data);
        } else {
          setError('Failed to load sleep data');
        }
      } catch (err) {
        setError('Error loading data: ' + err.message);
        console.error('Error details:', err);
      } finally {
        setLoading(false);
      }
    };
  
    loadData();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 600;
    const sensitivity = 30; // Lower value for faster rotation

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    const projection = d3.geoOrthographic()
      .scale(250)
      .center([0, 0])
      .rotate(rotation)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    svg.append("circle")
      .attr("fill", "#EEE")
      .attr("stroke", "#000")
      .attr("stroke-width", "0.2")
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", projection.scale());

    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(data => {
        const countries = svg.selectAll("path")
          .data(feature(data, data.objects.countries).features)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("fill", d => {
            const countryCode = countryIdToCode.get(String(d.id));
            const countryData = countryCode ? sleepData[countryCode] : null;
            return getColor(countryData?.[selectedMetric]);
          })
          .attr("stroke", "#333")
          .attr("stroke-width", 0.1)
         // Inside the useEffect where we create the countries
.on("mouseover", (event, d) => {
  console.log("Mouse over country:", d); // Debug log
  const countryCode = countryIdToCode.get(String(d.id));
  if (countryCode && sleepData[countryCode]) {
    setSelectedCountry(countryCode);
    d3.select(event.currentTarget)
      .attr("stroke-width", 1)
      .attr("stroke", "#000");
  }
})
.on("mouseout", (event) => {
  setSelectedCountry(null);
  d3.select(event.currentTarget)
    .attr("stroke-width", 0.1)
    .attr("stroke", "#333");
})

        const dragBehavior = d3.drag()
          .on("start", (event) => {
            setIsDragging(true);
            const proj = projection.rotate();
            dragStart.current = {
              x: event.x,
              y: event.y,
              rotation: [...proj]
            };
          })
          .on("drag", (event) => {
            if (dragStart.current) {
              const dx = (event.x - dragStart.current.x) / sensitivity;
              const dy = (event.y - dragStart.current.y) / sensitivity;
              const newRotation = [
                dragStart.current.rotation[0] + dx,
                dragStart.current.rotation[1] - dy,
                dragStart.current.rotation[2]
              ];
              setRotation(newRotation);
              projection.rotate(newRotation);
              svg.selectAll("path").attr("d", path);
            }
          })
          .on("end", () => {
            setIsDragging(false);
            dragStart.current = null;
          });

        svg.call(dragBehavior);
      });
  }, [rotation, selectedMetric, sleepData]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 flex items-center justify-center h-96">
        <div className="text-lg">Loading sleep data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 flex items-center justify-center h-96">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Global Sleep Patterns</h2>
            <div className="space-x-2">
              <button
                className={`px-4 py-2 rounded ${selectedMetric === 'avgSleep' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setSelectedMetric('avgSleep')}
              >
                Average Sleep
              </button>
              <button
                className={`px-4 py-2 rounded ${selectedMetric === 'insomnia' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setSelectedMetric('insomnia')}
              >
                Insomnia Rate
              </button>
              <button
                className={`px-4 py-2 rounded ${selectedMetric === 'qualityScore' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setSelectedMetric('qualityScore')}
              >
                Sleep Quality
              </button>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="relative">
            <svg
              ref={svgRef}
              className="w-full h-full"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            />
            
            {selectedCountry && sleepData[selectedCountry] && (
              <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg border text-sm">
                <h3 className="font-bold mb-2">{sleepData[selectedCountry].country}</h3>
                <p>Average Sleep: {sleepData[selectedCountry].avgSleep.toFixed(1)} hours</p>
                <p>Data Year: {sleepData[selectedCountry].year}</p>
                <p>Insomnia Rate: {sleepData[selectedCountry].insomnia.toFixed(1)}%</p>
                <p>Sleep Quality Score: {sleepData[selectedCountry].qualityScore.toFixed(1)}/10</p>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">
                {selectedMetric === 'avgSleep' ? 'Average Sleep Hours' :
                 selectedMetric === 'insomnia' ? 'Insomnia Rate (%)' :
                 'Sleep Quality Score'}
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-24 h-4" style={{
                  background: selectedMetric === 'avgSleep' ? 'linear-gradient(to right, #4575b4, #ffffbf, #d73027)' :
                             selectedMetric === 'insomnia' ? 'linear-gradient(to right, #ffffb2, #fd8d3c, #bd0026)' :
                             'linear-gradient(to right, #440154, #21908c, #fde725)'
                }} />
                <span className="text-sm">
                  {selectedMetric === 'avgSleep' ? '6h → 8h' :
                   selectedMetric === 'insomnia' ? '20% → 40%' :
                   '0 → 10'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldGlobe;