document.getElementById('uploadForm').addEventListener('submit', function (e) {
    e.preventDefault();
    let formData = new FormData(this);
    fetch('/upload', {
        method: 'POST',
        body: formData
    }).then(response => response.json())
      .then(data => {
          console.log(data.message);
          displayGallery(data.files);
      });
});

document.getElementById('saveFinalLocations').addEventListener('click', function () {
    // Save user locations
    saveLocations('/save_user_locations', 'final_x', 'final_y');
});

document.getElementById('saveButton').addEventListener('click', function () {
    // Save admin locations
    saveLocations('/save_admin_locations', 'initial_x', 'initial_y');
});

let selectedVideo = null;

function saveLocations(endpoint, xLabel, yLabel) {
    let locations = [];
    d3.selectAll("foreignObject").each(function () {
        let x = this.x.baseVal.value + 25;
        let y = this.y.baseVal.value + 25;

        locations.push({
            [xLabel]: x,
            [yLabel]: y,
            src: this.firstChild.src
        });
    });

    let questionText = document.getElementById('question').innerText;
    let dataToSave = { locations, question: questionText };

    console.log('Data to save:', dataToSave); // For debugging

    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSave)
    })
    .then(response => {
        if (response.redirected) {
            // Handle the redirection
            window.location.href = response.url;
        } else {
            return response.json(); // Process JSON if there's no redirection
        }
    })
    .then(data => {
        console.log('Success:', data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}


function displayGallery(files) {
    let gallery = document.getElementById('gallery');
    gallery.innerHTML = '';
    files.forEach(file => {
        let video = document.createElement('video');
        video.src = '/uploads/' + file;
        video.width = 100;
        video.controls = true;
        video.draggable = true;
        video.dataset.src = file;
        video.autoplay = true;
        video.loop = true;
        video.addEventListener('dragstart', handleDragStart);
        video.addEventListener('click', handleVideoClick);
        gallery.appendChild(video);
    });

    updateCoordinatesBlock();
}

function handleVideoClick(event) {
    selectedVideo = event.target;
    document.getElementById('coordinateInput').style.display = 'block';
    document.getElementById('xCoord').value = selectedVideo.parentElement.x.baseVal.value;
    document.getElementById('yCoord').value = selectedVideo.parentElement.y.baseVal.value;
}

function setCoordinatesForSelectedVideo(x, y) {
    if (selectedVideo) {
        d3.select(selectedVideo.parentElement)
            .attr("x", x)
            .attr("y", y);
        document.getElementById('coordinateInput').style.display = 'none';
        selectedVideo = null;
        updateCoordinatesBlock();
    }
}

function handleDragStart(event) {
    event.dataTransfer.setData('text/plain', event.target.dataset.src);
}


function renderCircle() {
    let circleContainer = d3.select("#circleContainer");
    let radius = 250;
    let padding = 50; 
    let centerX = circleContainer.node().clientWidth / 2; 
    let centerY = circleContainer.node().clientHeight / 2; 

    let containerWidth = 2 * (radius + padding);
    let containerHeight = 2 * (radius + padding);

    let svg = circleContainer.append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .style("position", "absolute") 
        .style("top", 0)
        .style("left", 0);

    svg.append("circle")
        .attr("cx", containerWidth / 2)
        .attr("cy", containerHeight / 2)
        .attr("r", radius)
        .style("fill", "none")
        .style("stroke", "#000");

    svg.on("dragover", function (event) {
        event.preventDefault();
    });

    svg.on("drop", function (event) {
        event.preventDefault();
        let src = event.dataTransfer.getData('text/plain');
        let draggedVideo = document.querySelector(`video[data-src='${src}']`);
        let existingForeignObject = d3.select(`foreignObject video[data-src='${draggedVideo.dataset.src}']`).node()?.parentElement;

        if (draggedVideo && existingForeignObject) {
            // If the video is already in the circle, update its position
            let x = event.offsetX - 25;
            let y = event.offsetY - 25;

            d3.select(existingForeignObject)
                .attr("x", x)
                .attr("y", y);
        } else if (draggedVideo) {
            // Otherwise, add it to the circle
            let x = event.offsetX - 25;
            let y = event.offsetY - 25;

            let video = document.createElementNS("http://www.w3.org/1999/xhtml", "video");
            video.src = draggedVideo.src;
            video.width = 50;
            video.controls = true;
            video.draggable = true;
            video.autoplay = true;
            video.loop = true;
            video.dataset.src = src;
            video.addEventListener('dragstart', handleDragStart);
            video.addEventListener('click', handleVideoClick);

            let foreignObject = svg.append("foreignObject")
                .attr("x", x)
                .attr("y", y)
                .attr("width", 50)
                .attr("height", 50)
                .call(d3.drag()
                    .on("drag", function (event) {
                        d3.select(this)
                            .attr("x", event.x - 25)
                            .attr("y", event.y - 25);
                    })
                ).node();

            foreignObject.appendChild(video);
        }
        updateCoordinatesBlock();
    });
}




function updateCoordinatesBlock() {
    let coordinatesBlock = document.getElementById('coordinatesBlock');
    coordinatesBlock.innerHTML = '';

    d3.selectAll("foreignObject").each(function () {
        let x = this.x.baseVal.value + 25;
        let y = this.y.baseVal.value + 25;
        let src = this.firstChild.src;

        let div = document.createElement('div');
        div.className = 'coordinate-item';

        let video = document.createElement('video');
        video.src = src;
        video.width = 50;
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        div.appendChild(video);

        let xLabel = document.createElement('label');
        xLabel.innerText = 'X:';
        div.appendChild(xLabel);

        let xInput = document.createElement('input');
        xInput.type = 'number';
        xInput.value = x;
        xInput.addEventListener('change', function () {
            setCoordinatesForVideo(src, xInput.value, yInput.value);
        });
        div.appendChild(xInput);

        let yLabel = document.createElement('label');
        yLabel.innerText = 'Y:';
        div.appendChild(yLabel);

        let yInput = document.createElement('input');
        yInput.type = 'number';
        yInput.value = y;
        yInput.addEventListener('change', function () {
            setCoordinatesForVideo(src, xInput.value, yInput.value);
        });
        div.appendChild(yInput);

        coordinatesBlock.appendChild(div);
    });
}

function setCoordinatesForVideo(src, x, y) {
    d3.selectAll("foreignObject").each(function () {
        if (this.firstChild.src === src) {
            d3.select(this)
                .attr("x", x - 25)
                .attr("y", y - 25);
        }
    });
}

function placeSavedVideos(savedData) {
    let svg = d3.select("svg");
    
    // Clear previous foreignObjects to avoid duplication
    //svg.selectAll("foreignObject").remove();

    savedData.locations.forEach(location => {
        // Check if the video is already present in the SVG
        let existingVideo = d3.select(`foreignObject video[src='${location.src}']`).node();

        if (!existingVideo) {
            let video = document.createElementNS("http://www.w3.org/1999/xhtml", "video");
            video.src = location.src;
            video.width = 50;
            video.controls = true;
            video.draggable = true;
            video.autoplay = true;
            video.loop = true;
            video.dataset.src = location.src;
            video.addEventListener('dragstart', handleDragStart);
            video.addEventListener('click', handleVideoClick);

            let foreignObject = svg.append("foreignObject")
                .attr("x", location.initial_x - 25)  // Adjust the position based on video dimensions
                .attr("y", location.initial_y - 25)  // Adjust the position based on video dimensions
                .attr("width", 50)
                .attr("height", 50)
                .call(d3.drag()
                    .on("drag", function (event) {
                        d3.select(this)
                            .attr("x", event.x - 25)
                            .attr("y", event.y - 25);
                    })
                ).node();

            foreignObject.appendChild(video);
        }
    });

    if (savedData.locations.length > 0) {
        document.getElementById('question').innerText = savedData.locations[0].question;
    }

    updateCoordinatesBlock();
}


function loadSavedLocationsFromDatabase() {
    fetch('/load_admin_locations')
        .then(response => response.json())
        .then(data => {
            placeSavedVideos(data);
        })
        .catch(error => console.error('Error loading saved locations:', error));
}

document.addEventListener('DOMContentLoaded', function () {
     loadSavedLocationsFromDatabase();
     //renderCircle();
});
