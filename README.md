# Gaze-Based Engagement Measurement System

## Overview

This project presents a webcam-based gaze tracking system designed to measure user engagement through both passive observation and adaptive gaze-contingent interaction. The system captures gaze data using standard webcams and evaluates engagement using multiple behavioural and performance-based metrics.

The primary objective of the project is to demonstrate that engagement can be measured more effectively through interactive gaze-based tasks rather than passive observation alone.

---

## Features

- Webcam-based gaze estimation using computer vision techniques
- AOI (Area of Interest) based gaze classification
- Passive gaze observation mode
- Adaptive gaze-contingent interaction mode
- Real-time gaze tracking and interaction
- Behavioural metrics extraction including:
  - Time to First Fixation (TTFF)
  - Dwell Ratio
  - Gaze Entropy
  - Search Efficiency
  - Distraction Captures
  - Hold Breaks

---

## System Architecture

The system operates through the following pipeline:

1. Webcam input capture
2. Facial landmark and eye region detection
3. Gaze estimation and mapping to screen coordinates
4. AOI classification
5. Task execution (Passive or Adaptive)
6. Data logging and metric computation
7. Post-processing and analysis

---

## Methodology

The system was evaluated using two task paradigms:

### Passive Task

Participants observe visual content while gaze data is recorded. This mode measures attention without requiring interaction.

### Adaptive Task

Participants interact with targets using gaze. Progression depends on maintaining gaze on targets, enabling measurement of goal-directed engagement.

A total of 10 participants were tested, and both quantitative gaze data and qualitative questionnaire responses were collected.

---

## Key Findings

- Passive tasks produced higher dwell ratios but did not reflect meaningful engagement
- Adaptive tasks showed strong relationships between gaze behaviour and performance
- Distraction and attention shifts directly impacted task completion time in adaptive tasks
- Gaze entropy was higher in adaptive tasks, indicating dynamic and goal-directed behaviour
- Questionnaire responses confirmed higher perceived engagement during adaptive interaction

---

## Technologies Used

- JavaScript (frontend and browser-based tracking)
- Python (data processing and analysis)
- OpenCV / MediaPipe (facial landmark detection)
- Machine learning models for gaze estimation
- Excel / Python libraries for data analysis and visualization

---

## Dataset

The dataset consists of:

- Gaze metrics collected from passive and adaptive tasks
- Participant performance data
- Post-experiment questionnaire responses

---

## Limitations

- Sensitivity to webcam positioning and head movement
- Dependence on lighting conditions
- Reduced accuracy on smaller screens
- Limited variation in background stimuli
- Calibration required for each user

---

## Future Work

- Improve robustness using head pose compensation
- Enhance gaze estimation using deep learning models
- Introduce more complex and varied task environments
- Integrate additional behavioural signals such as facial expressions
- Apply the system in real-world applications such as education and usability testing

---

## Conclusion

This project demonstrates that while traditional gaze-based systems are effective for measuring attention, they are limited in capturing meaningful engagement. By introducing adaptive gaze-contingent interaction, this system provides a more reliable and behaviourally grounded method for evaluating user engagement.

---

## Author

Akshvinth John
