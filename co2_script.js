
   var view = new ol.View({
        center: ol.proj.fromLonLat([11.4218687,48.233913]),
        zoom: 9
    }); 


   var map = new ol.Map({
      target: 'map',
      view: view,
      layers: [ new ol.layer.Tile({source: new ol.source.OSM()})]
      });

   var str_marker;
   var end_marker;
   var lin_points;
   var vector_line;


    async function apiGeo(locate,ORS_TOKEN) {
    return new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', 'https://api.openrouteservice.org/geocode/search?api_key=' + ORS_TOKEN + '&text=' + locate, true);
        request.send();
        request.onload = function () {
            var data = JSON.parse(this.responseText);
            var lat_lng = new Array(1);
            var coord;

            if (request.status >= 200 && request.status < 400) {
                if (data.features.length!=0){
                    lat_lng[0] = data.features[0].geometry.coordinates[0];
                    lat_lng[1] = data.features[0].geometry.coordinates[1];
                    coord = lat_lng[0]+','+lat_lng[1];
                    return resolve(coord);
                }else
                    return resolve('Address not found');
            } else {
                console.log('Address not found');
                return resolve('Address not found');
            }
        }
        });
    }

    async function apiDist(start_coord,end_coord,ORS_TOKEN) {
    return new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest();

        request.open('GET', 'https://api.openrouteservice.org/v2/directions/driving-car?api_key=' + ORS_TOKEN + '&start=' + start_coord + '&end=' + end_coord, true);
        request.send();
        request.onload = function () {
            var data = JSON.parse(this.responseText);
            var dist;

            if (request.status >= 200 && request.status < 400) {
                dist = data.features[0].properties.summary.distance;
                return resolve(dist);
            } else {
                console.log('Address not found');
                return resolve('Address not found'); 
            }
        }
        });
    }  

    async function co2_emission_calc() {
        var points = new Array(1);
        var coord = new Array(1);
        var str_point = new Array(1);
        var end_point = new Array(1);
        var mid_point = new Array(1);
        var ORS_TOKEN;
        var dist;
        var co_transp;
        var co_amount = 0;
        var zoom = 10;

        const app = document.getElementById('floating-panel');

        map.removeLayer(str_marker);
        map.removeLayer(end_marker);
        map.removeLayer(vector_line);

        ORS_TOKEN = document.getElementById("ORS_TOKEN").value;
        points[0] = document.getElementById("start_city").value;
        points[1] = document.getElementById("end_city").value;

        co_transp = document.getElementById("start_city").value;

        var co_transp_sel = document.getElementById("transp_method");
        var co_amount = co_transp_sel.options[co_transp_sel.selectedIndex].value;

        for (i = 0; i <=1; i++) {
            coord[i] = await apiGeo(points[i],ORS_TOKEN);
        }

        if (coord[0] != 'Address not found' && coord[1] != 'Address not found'){
            dist = await apiDist(coord[0],coord[1],ORS_TOKEN);

            str_point = coord[0].split(",");
            end_point = coord[1].split(",");
            mid_point[0] = (parseFloat(str_point[0])+parseFloat(end_point[0]))/2;
            mid_point[1] = (parseFloat(str_point[1])+parseFloat(end_point[1]))/2;
           
            str_marker = new ol.layer.Vector({
                                        source: new ol.source.Vector({
                                        features: [new ol.Feature({geometry: new ol.geom.Point(ol.proj.fromLonLat([str_point[0],str_point[1]]))})]})
            });

            end_marker = new ol.layer.Vector({
                                        source: new ol.source.Vector({
                                        features: [new ol.Feature({geometry: new ol.geom.Point(ol.proj.fromLonLat([end_point[0],end_point[1]]))})]})
            });

            lin_points = new ol.geom.LineString([ol.proj.fromLonLat([str_point[0],str_point[1]]), ol.proj.fromLonLat([end_point[0],end_point[1]])])
            vector_line = new ol.layer.Vector({
                            source: new ol.source.Vector({
                            features: [new ol.Feature({
                              geometry: lin_points,
                              name: 'Line'
                          })]
                      }),
                  });

            map.addLayer(str_marker);
            map.addLayer(end_marker);
            map.addLayer(vector_line);

            var h1 = document.getElementById('result');
            if (h1 == null) {    
                h1 = document.createElement('result');
                if (dist=='Address not found')
                    h1.textContent = 'Trip will depend on other transport ways.';
                else
                    h1.textContent = 'Distance: ' + formatNumber(parseFloat(dist/1000).toFixed(2)) + ' km';
                h1.setAttribute('id', 'result');
                app.appendChild(h1);
            }else{
                if (dist=='Address not found')
                    h1.textContent = 'Trip will depend on other transport ways.';
                else
                    h1.textContent = 'Distance: ' + formatNumber(parseFloat(dist/1000).toFixed(2)) + ' km';
            }

            co_amount = co_amount*dist/1000;
            var h2 = document.getElementById('result_co');
            if (h2 == null) {    
                app.appendChild(document.createElement('br'));
                h2 = document.createElement('result_co');
                if (dist=='Address not found')
                    h2.textContent = '';
                else
                    h2.textContent = 'Your trip caused ' + formatNumber(parseFloat(co_amount/1000).toFixed(2)) + 'kg of CO2-equivalent.';
                h2.setAttribute('id', 'result_co');
                app.appendChild(h2);
            }else{
                if (dist=='Address not found')
                    h2.textContent = '';
                else
                    h2.textContent = 'Your trip caused ' + formatNumber(parseFloat(co_amount/1000).toFixed(2)) + 'kg of CO2-equivalent.';
            }

            view.fit(lin_points.getExtent(), {size: map.getSize()});

        } else{

            var h1 = document.getElementById('result');
            var h2 = document.getElementById('result_co');
            if (h1 == null) {    
                h1 = document.createElement('result');
                h1.textContent = 'Error. No address could be found.';
                h2.textContent = '';
                h1.setAttribute('id', 'result');
                app.appendChild(h1);
            }else{
                h1.textContent = 'Error. No address could be found.';
                h2.textContent = '';
            }        
        }
    }

    function formatNumber(num) {
        return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
    }
