const video = document.getElementById("video");

// Load face-api models
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceExpressionNet.loadFromUri("/models"),
  faceapi.nets.ageGenderNet.loadFromUri("/models")
]).then(startVideo);

// Start webcam
function startVideo() {
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then(stream => video.srcObject = stream)
    .catch(err => console.error(err));
}

// 🔐 Flag → only first time send to backend
let ageSentToBackend = false;

video.addEventListener("play", () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.getElementById("video-container").append(canvas);

  const displaySize = {
    width: video.videoWidth,
    height: video.videoHeight
  };

  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    resizedDetections.forEach(det => {
      const age = Math.round(det.age);
      const gender = det.gender;

      // Draw box on face
      const box = det.detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, { label: `${age} yrs | ${gender}` });
      drawBox.draw(canvas);

      // 🔥 Send to backend only first time
      if (!ageSentToBackend) {
        ageSentToBackend = true;

       fetch("http://localhost:3000/save-age", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ age, gender })
})

        .then(res => res.json())
        .then(data => console.log("Backend response:", data))
        .catch(err => console.log("Backend error:", err));
      }
    });
  }, 500); // slower interval → stable
});
