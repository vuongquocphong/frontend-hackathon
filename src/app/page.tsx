"use client";
import React, { useState, useCallback, useMemo } from "react";
import styles from "./page.module.css";

// const BASE_URL = "http://10.10.1.124:8000";
const BASE_URL = "http://127.0.0.1:8000";

export default function Home() {
  const [images, setImages] = useState<File[]>([]);
  const [processedImages, setProcessedImages] = useState<string[]>([]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setImages((prevImages) => [...prevImages, ...files]);
  }, []);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prevImages) => {
      const newImages = [...prevImages];
      newImages.splice(index, 1);
      return newImages;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      const processed = await Promise.all(
        images.map(async (image) => {
          const formData = new FormData();
          formData.append("file", image, image.name);
          console.log(image.type);
          const response = await fetch(`${BASE_URL}/predict/`, {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          console.log(data);
          return drawBoundingBoxes(image, data.predictions);
        })
      );
      setProcessedImages(processed);
    } catch (error) {
      console.error("Error processing images:", error);
    }
  }, [images]);

  const drawBoundingBoxes = async (image: File, predictions: any[]) => {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Draw bounding boxes
            const drawnTextPositions: any[] = [];
            predictions.forEach(
              (prediction: {
                name: string;
                brand: string;
                box: { x1: any; y1: any; x2: any; y2: any };
              }) => {
                const { x1, y1, x2, y2 } = prediction.box;
                ctx.strokeStyle = "red";
                ctx.lineWidth = 2;
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

                // Draw label
                ctx.font = "16px Arial";
                ctx.fillStyle = "yellow";

                let textX = x1;
                let textY = y2 + 20;

                // New code to prevent text from going out of bounds on the x-axis
                const text = `Type: ${prediction.name}, Brand: ${prediction.brand}`;
                const textWidth = ctx.measureText(text).width;
                const textHeight = 20;

                // Function to check overlap
                const isOverlapping = (
                  x: number,
                  y: number,
                  width: number,
                  height: number
                ) =>
                  drawnTextPositions.some(
                    (pos) =>
                      x < pos.x + pos.width + 10 &&
                      x + width + 10 > pos.x &&
                      y < pos.y + pos.height &&
                      y + height > pos.y
                  );

                // Check if text goes out of bounds and adjust
                const canvasHeight = ctx.canvas.height;
                if (textY + 20 > canvasHeight) {
                  // Assuming 20px is the approximate height of the text
                  textY = y1 - 10; // Move text above the bounding box if it goes out of bounds
                  // Ensure textY does not become negative
                  if (textY < 0) textY = 10; // Place it near the top of the canvas
                }

                const canvasWidth = ctx.canvas.width;
                if (textX + textWidth > canvasWidth) {
                  textX = canvasWidth - textWidth - 10; // Adjust textX to prevent overflow, 10 is a margin
                  // Ensure textX does not become negative
                  if (textX < 0) textX = 10; // Place it near the start of the canvas if adjustment makes it negative
                }
                // Adjust textY to avoid overlap
                while (isOverlapping(textX, textY, textWidth, textHeight)) {
                  textY += 20; // Move text down by 20 pixels
                }

                drawnTextPositions.push({
                  x: textX,
                  y: textY,
                  width: textWidth,
                  height: textHeight,
                });

                ctx.fillText(
                  `Type: ${prediction.name}, Brand: ${prediction.brand}`,
                  textX,
                  textY
                );
              }
            );
            resolve(canvas.toDataURL());
          } else {
            reject(new Error("Canvas context is not available"));
          }
        };
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(image);
    });
  };

  const imagePreviews = useMemo(
    () =>
      images.map((image, index) => (
        <div key={index} className={styles.preview}>
          <img
            src={URL.createObjectURL(image)}
            alt={`Preview ${index}`}
            className={styles.previewImage}
          />
          <button
            className={styles.removeButton}
            onClick={() => handleRemoveImage(index)}
          >
            X
          </button>
        </div>
      )),
    [images, handleRemoveImage]
  );

  const processedImagePreviews = useMemo(
    () =>
      processedImages.map((image, index) => (
        <div key={index} className={styles.preview}>
          <img
            src={image}
            alt={`Processed ${index}`}
            className={styles.previewImage}
          />
        </div>
      )),
    [processedImages]
  );

  return (
    <main className={styles.main}>
      <div
        className={styles.dropzone}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <p>Drag and drop images here</p>
        {imagePreviews}
      </div>

      <button onClick={handleSubmit} className={styles.submitButton}>
        Submit
      </button>

      <div className={styles.resultZone}>
        <h2>Processed Images</h2>
        {processedImagePreviews}
      </div>
    </main>
  );
}
