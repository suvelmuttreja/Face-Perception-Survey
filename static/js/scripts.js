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

let logoutButton = document.getElementById('logout')
if(logoutButton != null) logoutButton.addEventListener('click', function () {
    //clear session and redirect to admin login
    fetch('/logout', {method: 'POST'}).then(response => {
        if (response.redirected) {
            // Handle the redirection
            window.location.href = response.url;
        } 
    })
});

if(document.getElementById('saveFinalLocations') != null) document.getElementById('saveFinalLocations').addEventListener('click', function () {
    // Save user locations
    saveLocations('/save_user_locations', 'final_x', 'final_y');
});

if(document.getElementById('saveButton') != null) document.getElementById('saveButton').addEventListener('click', function () {
    console.log("save button clicked");
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
    // if (event.target.style.transform === 'scale(7)') {
    //     event.target.style.transform = 'scale(1)';
    //     // foreignObject.style.position = 'relative'; // Reset position
    //     event.target.style.zIndex = '1'; // Reset z-index
    // } 
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
            console.log("found dragged video")
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
    
            // Add hover functionality to enlargen video on hover
            video.addEventListener('contextmenu', function (e) {
                e.preventDefault(); // Prevent the default right-click context menu
    
                // Toggle the 'enlarged' state for the video
                if (video.style.transform === 'scale(7)') {
                    video.style.transform = 'scale(1)';
                    video.style.position = 'relative'; // Reset position
                    video.style.zIndex = '1'; // Reset z-index
                } else {
                    video.style.transform = 'scale(7)'; // Enlarge the video
                    video.style.transition = 'transform 0.3s ease'; // Smooth transition
                    video.style.position = 'absolute'; // Take it out of normal flow
                    video.style.zIndex = '100'; // Bring it to the top
                }
            });
    
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

// Handle hover events for video playback and scaling
const videos = document.querySelectorAll('.video-thumbnail');

videos.forEach(video => {
  // Play video when hovered and set it to loop
  video.addEventListener('mouseenter', () => {
    video.play();
    video.loop = true; // Ensure looping on hover
  });

  // Pause video when mouse leaves
  video.addEventListener('mouseleave', () => {
    video.pause();
  });

  // Toggle play/pause on click
  video.addEventListener('click', () => {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  });
});

document.querySelectorAll('.foreignObject').forEach(video => {
    video.addEventListener('mousemove', function (event) {
        // Get bounding box of the video element
        const rect = video.getBoundingClientRect();
        
        // Calculate the mouse position relative to the video element
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Set the transform-origin based on the mouse position
        video.style.transformOrigin = `${x}px ${y}px`;
    });
});


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
            // video.width = 50;
            video.autoplay = true; // Start playing automatically
            video.loop = true; // Loop the video indefinitely
            video.muted = true; // Ensure the video plays without sound
            video.draggable = true;
            video.autoplay = true;
            video.style.width = '100%';  // Make the video fit its container
            video.style.height = '100%';  // Make the video fit its container
            video.style.objectFit = 'cover';  // Ensure the video content scales properly within the bounding box
            video.loop = true;
            video.dataset.src = location.src;
            video.addEventListener('dragstart', handleDragStart);
            video.addEventListener('click', handleVideoClick);

            let foreignObject = svg.append("foreignObject")
                .attr("x", location.initial_x - 25)  // Adjust the position based on video dimensions
                .attr("y", location.initial_y - 25)  // Adjust the position based on video dimensions
                .attr("width", 100)
                .attr("height", 50)
                .on("drag", function (event) {
                    if (!foreignObject.classList.contains('scaled')) { // Only allow dragging if not scaled
                        d3.select(this)
                            .attr("x", event.x - videoWidth / 2)
                            .attr("y", event.y - videoHeight / 2);
                    }
                }
                ).node();

            foreignObject.appendChild(video);

            // Add hover functionality to enlargen video on hover
            foreignObject.addEventListener('contextmenu', function (e) {
                e.preventDefault(); // Prevent the default right-click context menu
    
                // Toggle the 'enlarged' state for the video
                if (foreignObject.style.transform === 'scale(4)') {
                    foreignObject.style.transform = 'scale(1)';
                    // foreignObject.style.position = 'relative'; // Reset position
                    foreignObject.style.zIndex = '1'; // Reset z-index
                    foreignObject.classList.remove('scaled');
                } else {
                    foreignObject.style.transform = 'scale(4)'; // Enlarge the video
                    foreignObject.style.transition = 'transform 0.3s ease'; // Smooth transition
                    // foreignObject.style.position = 'absolute'; // Take it out of normal flow
                    foreignObject.style.zIndex = '100'; // Bring it to the top
                    foreignObject.classList.add('scaled');
                }
            });
        }
    });

    if (savedData.locations.length > 0) {
        document.getElementById('question').innerText = savedData.locations[0].question;
    }

    updateCoordinatesBlock();
}
document.addEventListener('DOMContentLoaded', function () {
    // Run initial check on load
    checkClipsInCircle();

    // Set up an observer to monitor for changes (like drag events)
    const observer = new MutationObserver(() => {
        checkClipsInCircle();
    });

    observer.observe(document.getElementById('circleContainer'), {
        childList: true,
        subtree: true,
        attributes: true
    });
});

document.addEventListener('DOMContentLoaded', function() {
    // Get the sources of all videos currently displayed
    let videoSources = [];
    d3.selectAll('foreignObject').each(function() {
        videoSources.push(d3.select(this).attr('data-src')); // Assuming 'data-src' holds the video URL or identifier
    });

    // Send a request to set start_time for all videos
    fetch('/set_start_time', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videos: videoSources })
    });
});

if(document.getElementById('saveFinalLocations') != null) document.getElementById('saveFinalLocations').addEventListener('click', function() {
    let videoSources = [];
    d3.selectAll('foreignObject').each(function() {
        videoSources.push(d3.select(this).attr('data-src')); // Assuming 'data-src' holds the video identifier
    });

    // Send the sources to save the end time
    fetch('/save_end_time', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videos: videoSources })
    }).then(response => response.json())
      .then(data => console.log(data.message));
});



document.addEventListener('DOMContentLoaded', function () {

    checkClipsInCircle();

    // Set up an observer to monitor for changes (like drag events)
    const observer = new MutationObserver(() => {
        checkClipsInCircle();
    });

    observer.observe(document.getElementById('circleContainer'), {
        childList: true,
        subtree: true,
        attributes: true
    });
});

function checkClipsInCircle() {
    const notification = document.getElementById('notification');
    const saveButton = document.getElementById('saveFinalLocations');

    if(notification == null || saveButton == null) return;

    if (!areClipsWithinCircle()) {
        notification.textContent = 'One or more clips are outside the circle. Please move them into the circle.';
        saveButton.disabled = true; 
    } else {
        notification.textContent = '';  
        saveButton.disabled = false;  
    }
}

function areClipsWithinCircle() {
    let centerX = 300; 
    let centerY = 300; 
    let radius = 250;  
    let isValid = true;

    d3.selectAll("foreignObject").each(function () {
        let bbox = this.getBBox(); 
        let clipCenterX = bbox.x + (bbox.width / 2);
        let clipCenterY = bbox.y + (bbox.height / 2); 


        let distance = Math.sqrt(Math.pow(clipCenterX - centerX, 2) + Math.pow(clipCenterY - centerY, 2));

 
        if (distance > radius) {
            isValid = false; 
        }
    });

    return isValid; 
}


function loadSavedLocationsFromDatabase() {
    fetch('/load_admin_locations', {method: 'POST'})
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
