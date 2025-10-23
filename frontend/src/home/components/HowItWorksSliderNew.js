import React, { useState, useEffect } from 'react';
import '../css/HowItWorksSliderNew.css';

// Import images
import scanQRImage from '../images/Scan QR Code.jpg';
import browseMenuImage from '../images/Browse Menu.jpg';
import securePaymentImage from '../images/Payment.jpg';
import orderProcessingImage from '../images/Order Processing.jpg';
import seatDeliveryImage from '../images/Seat Delivery.webp';
import analyticsReportsImage from '../images/Analytics & Reports.jpg';

const HowItWorksSlider = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 1,
      number: "01",
      topic: "Scan QR Code",
      description: "Audience members scan a unique QR code placed on their theater seat using their smartphone for instant access to the digital menu.",
      image: scanQRImage,
      // icon: "📱"
    },
    {
      id: 2,
      number: "02",
      topic: "Browse Menu",
      description: "Access a full digital menu with detailed descriptions, images, and prices. Add items to the cart with just a few taps.",
      image: browseMenuImage,
      // icon: "🍿"
    },
    {
      id: 3,
      number: "03",
      topic: "Secure Payment",
      description: "Pay safely through integrated payment gateways like Razorpay, with multiple secure payment options available.",
      image: securePaymentImage,
      // icon: "💳"
    },
    {
      id: 4,
      number: "04",
      topic: "Order Processing",
      description: "Orders are instantly sent to the kitchen with seat details. Real-time updates keep customers informed on progress.",
      image: orderProcessingImage,
      // icon: "⚡"
    },
    {
      id: 5,
      number: "05",
      topic: "Seat Delivery",
      description: "Snacks and beverages are delivered directly to the customer's seat, ensuring uninterrupted enjoyment of the show.",
      image: seatDeliveryImage,
      // icon: "🎯"
    },
    {
      id: 6,
      number: "06",
      topic: "Analytics & Reports",
      description: "Theater management receives detailed sales reports, order analytics, and performance insights to optimize operations.",
      image: analyticsReportsImage,
      // icon: "📊"
    }
  ];

  useEffect(() => {
    const autoPlay = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);

    return () => clearInterval(autoPlay);
  }, [steps.length]);

  const handleStepClick = (index) => {
    setActiveStep(index);
  };

  return (
    <section id="how-it-works" className="how-it-works-new">
      <div className="how-it-works-diagonal-bg"></div>
      <div className="how-it-works-particles">
        <div className="hiw-particle hiw-particle-1"></div>
        <div className="hiw-particle hiw-particle-2"></div>
        <div className="hiw-particle hiw-particle-3"></div>
      </div>
      
      <div className="container">
        <div className="section-header-new">
          <div className="section-badge">
            <span className="badge-icon-new">✨</span>
            <span>Simple Process</span>
          </div>
          <h2 className="section-title-new">How It Works</h2>
          <p className="section-subtitle-new">
            Get started with our seamless QR ordering system in just 6 simple steps
          </p>
        </div>

        {/* New Grid Layout - All Steps Visible */}
        <div className="steps-grid">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`step-grid-card ${activeStep === index ? 'active' : ''}`}
              onClick={() => handleStepClick(index)}
            >
              <div className="step-card-image-wrapper">
                <img 
                  src={step.image} 
                  alt={step.topic}
                  className="step-card-image"
                />
                <div className="step-card-overlay">
                  <div className="step-card-icon">{step.icon}</div>
                </div>
              </div>
              <div className="step-card-content">
                <div className="step-card-number">{step.number}</div>
                <h3 className="step-card-title">{step.topic}</h3>
                <p className="step-card-description">{step.description}</p>
              </div>
              <div className="step-card-arrow">→</div>
            </div>
          ))}
        </div>

        {/* Progress Indicator */}
        <div className="steps-progress-bar">
          <div className="progress-bar-track">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
          <div className="progress-steps">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`progress-step ${activeStep >= index ? 'completed' : ''} ${activeStep === index ? 'active' : ''}`}
                onClick={() => handleStepClick(index)}
              >
                <span>{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSlider;
