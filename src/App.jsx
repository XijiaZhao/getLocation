import { useState } from 'react'
import './App.css'
import * as math from 'mathjs';

function App() {
  const [comingData, setComingData] = useState('');
  const [numDays, setNumDays] = useState(5);
  const [pointLimit, setPointLimit] = useState(3);
  const [varianceThreshold, setVarianceThreshold] = useState(0.005);
  const [resultDict, setResultDict] = useState(null);

  const processLocations = (comingData, numDays, pointLimit, varianceThreshold) => {

      const initializeCentroids = (points, numLocations) => {
          const indices = math.range(0, points.length - 1, (points.length - 1) / (numLocations - 1)).toArray();
          return indices.map(index => points[Math.round(index)]);
      };

      const varianceCal = (group) => {
          if (group.length <= 1) return 0;
          const mean = group[0].map((_, i) => group.reduce((sum, point) => sum + point[i], 0) / group.length);
          const variance = group.reduce((sum, point) =>
              sum + point.reduce((innerSum, coord, i) => innerSum + Math.pow(coord - mean[i], 2), 0)
          , 0) / group.length;
          return variance;
      };

      const groupLocations = (points, numDays, maxIterations = 10, pointLimit = 2, varianceThreshold = 0.004) => {
          points.sort((a, b) => math.norm(a) - math.norm(b));

          let centroids = initializeCentroids(points, numDays);
          let groups = [];

          for (let i = 0; i < maxIterations; i++) {
              groups = Array.from({ length: numDays }, () => []);
              points.forEach(point => {
                  const distances = centroids.map(centroid => math.norm(math.subtract(point, centroid)));
                  const nearestCentroid = distances.indexOf(Math.min(...distances));
                  groups[nearestCentroid].push(point);
              });

              centroids = groups.map(group => {
                  return group.length > 0 ? group[0].map((_, i) => group.reduce((sum, point) => sum + point[i], 0) / group.length) : points[Math.floor(points.length / 2)];
              });
          }

          groups.sort((a, b) => math.norm(math.mean(b, 0)) - math.norm(math.mean(a, 0)));

          const finalgroups = groups.map(group => {
              let groupArray = [...group];
              let currentVar = varianceCal(groupArray);

              while (currentVar > varianceThreshold) {
                  const meanValue = math.mean(groupArray, 0);
                  const distances = groupArray.map(point => math.norm(math.subtract(point, meanValue)));
                  const variantIndex = distances.indexOf(Math.max(...distances));
                  groupArray.splice(variantIndex, 1);
                  currentVar = varianceCal(groupArray);
              }

              if (groupArray.length > pointLimit && groupArray.length - pointLimit < 0.5 * pointLimit) {
                  groupArray = groupArray.slice(0, pointLimit);
              }

              return groupArray;
          });

          return { finalgroups, finalCentroids: finalgroups.map(group => math.mean(group, 0)) };
      };

      const locations = JSON.parse(comingData);
      const latMap = {};
      locations.forEach(item => {
          latMap[item.location.lat] = item;
      });

      const points = locations.map(location => [location.location.lat, location.location.lng]);
      const { finalgroups: groups } = groupLocations(points, numDays, 10, pointLimit, varianceThreshold);

      const result = {};
      groups.forEach((group, i) => {
          const dayKey = `Day${i + 1}`;
          result[dayKey] = group.map(lat => latMap[lat[0]]);
      });

      return result;
  };

  const handleSubmit = () => {
      const result = processLocations(comingData, parseInt(numDays), parseInt(pointLimit), parseFloat(varianceThreshold));
      setResultDict(result);
  };

  return (
      <div className="App">
          <h1>Group Locations</h1>

          <div>
              <label>Coming Data (JSON):</label><br/>
              <textarea value={comingData} onChange={(e) => setComingData(e.target.value)} rows={10} cols={50} />
          </div>

          <div>
              <label>Number of Days:</label><br/>
              <input type="number" value={numDays} onChange={(e) => setNumDays(e.target.value)} />
          </div>

          <div>
              <label>Plot Limit(not using this):</label><br/>
              <input type="number" value={pointLimit} onChange={(e) => setPointLimit(e.target.value)} />
          </div>

          <div>
              <label>Variance Threshold:(&lt; 0.004)</label><br/>
              <input type="number" step="0.01" value={varianceThreshold} onChange={(e) => setVarianceThreshold(e.target.value)} />
          </div>

          <button onClick={handleSubmit}>Process</button>

          {resultDict && (
              <div>
                  <h2>Result:</h2>
                  <pre>{JSON.stringify(resultDict, null, 2)}</pre>
              </div>
          )}
      </div>
  );
}

export default App;
