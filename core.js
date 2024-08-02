async function loadJsonData(shipName) {
    const response = await fetch(`./Ships/${shipName}.json`);
    const data = await response.json();
    return data;
}

window.shipData = {};

Promise.all([
    loadJsonData('irsavatha'),
    loadJsonData('kaliare'),
    loadJsonData('moccotar'),
    loadJsonData('moxella'),
    loadJsonData('pskellon')
]).then(results => {
    const shipNames = ['Irsavatha', 'Kaliare', 'Moccotar', 'Moxella', 'Pskellon'];
    results.forEach((data, index) => {
        window.shipData[shipNames[index]] = {
            SignatureData: data.SignatureData,
            MeshData: data.MeshData
        };
    });
    console.log('All data loaded');
});

window.createGraph = function(shipName) {
    const Data = window.shipData[shipName].SignatureData;
    const Mesh = window.shipData[shipName].MeshData;
    
    let data = Data;
    let meshData = Mesh;
    let minRadar = jStat.min(data.map(e => e.value));
    let triangles = [];
    for(let i = 0;i < data.length;i++) {
      let currNeighbors = data[i].neighbors;
      if(currNeighbors[5] < 0) {
        currNeighbors.pop();
      }
      for(let j = 0;j < currNeighbors.length - 1;j++) {
        if(currNeighbors[j] >= 0 && currNeighbors[j + 1] >= 0) {
          triangles.push({
            i: i,
            j: currNeighbors[j],
            k: currNeighbors[j + 1]
          });
        }
      }
      if(currNeighbors[currNeighbors.length - 1] >= 0 && currNeighbors[0] >= 0) {
        triangles.push({
          i: i,
          j: currNeighbors[currNeighbors.length - 1],
          k: currNeighbors[0]
        });
      }
    }
    for(let i = 0;i < triangles.length;i++) {
      let currTriangle = triangles[i];
      let foundDuplicate = false;
      for(let j = 0;!foundDuplicate && j < i;j++) {
        let pastTriangle = triangles[j];
        if(
          (currTriangle.i === pastTriangle.i && currTriangle.j === pastTriangle.j && currTriangle.k === pastTriangle.k) ||
          (currTriangle.i === pastTriangle.i && currTriangle.j === pastTriangle.k && currTriangle.k === pastTriangle.j) ||
          (currTriangle.i === pastTriangle.j && currTriangle.j === pastTriangle.i && currTriangle.k === pastTriangle.k) ||
          (currTriangle.i === pastTriangle.j && currTriangle.j === pastTriangle.k && currTriangle.k === pastTriangle.i) ||
          (currTriangle.i === pastTriangle.k && currTriangle.j === pastTriangle.i && currTriangle.k === pastTriangle.j) ||
          (currTriangle.i === pastTriangle.k && currTriangle.j === pastTriangle.j && currTriangle.k === pastTriangle.i)
        ) {
          foundDuplicate = true;
        }
      }
      if(foundDuplicate) {
        triangles.splice(i,1);
        i--;
      }
    }
    let chartData = [
      {
        name: 'Radar Signature',
        type: 'mesh3d',
        x: data.map(e => Vector.create([e.x, e.z, e.y]).multiply(e.value).e(1)),
        y: data.map(e => Vector.create([e.x, e.z, e.y]).multiply(e.value).e(2)),
        z: data.map(e => Vector.create([e.x, e.z, e.y]).multiply(e.value).e(3)),
        i: triangles.map(e => e.i),
        j: triangles.map(e => e.j),
        k: triangles.map(e => e.k),
        intensity: data.map(e => e.value),
        hovertext: data.map(e => 'RCS: ' + e.value + ' m^2'),
        colorscale: 'RdBu',
        opacity: 0.25
      }
    ];
    let largestMeshVertexMagnitude = 0;
    for(let mesh of meshData) {
      for(let i = 0;i < mesh.MeshVerticesData.length;i++) {
        let currVertex = mesh.MeshVerticesData[i];
        let mag = Vector.create([currVertex.x, currVertex.z, currVertex.y]).modulus();
        if(largestMeshVertexMagnitude < mag) {
          largestMeshVertexMagnitude = mag;
        }
      }
    }
    for(let mesh of meshData) {
      chartData.push({
        name: 'Ship' + Date.now(),
        type: 'mesh3d',
        x: mesh.MeshVerticesData.map(e => Vector.create([e.x, e.z, e.y]).multiply(minRadar / largestMeshVertexMagnitude).e(1)),
        y: mesh.MeshVerticesData.map(e => Vector.create([e.x, e.z, e.y]).multiply(minRadar / largestMeshVertexMagnitude).e(2)),
        z: mesh.MeshVerticesData.map(e => Vector.create([e.x, e.z, e.y]).multiply(minRadar / largestMeshVertexMagnitude).e(3)),
        i: mesh.MeshTriangleData.filter((e, i) => i % 3 === 0),
        j: mesh.MeshTriangleData.filter((e, i) => i % 3 === 1),
        k: mesh.MeshTriangleData.filter((e, i) => i % 3 === 2),
        color: 'rgb(0,0,0)'
      });
    }
  
    Plotly.newPlot('chartDiv', chartData, {
      width: 800,
      height: 800
    });
};
