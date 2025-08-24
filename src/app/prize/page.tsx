"use client";

import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function Home() {
  const [boxes, setBoxes] = useState<{ [key: number]: { prize: string; value: number; opened: boolean } }>({});
  const [searchTerm, setSearchTerm] = useState("");

  const [revealedPrize, setRevealedPrize] = useState<{ prize: string; value: number } | null>(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const initialBoxes: { [key: number]: { prize: string; value: number; opened: boolean } } = {};
      for (let i = 1; i <= 1000; i++) {
        initialBoxes[i] = {
          prize: `Prize ${i}`,
          value: Math.floor(Math.random() * 100) + 1,
          opened: false,
        };
      }
      setBoxes(initialBoxes);
    }
  }, []);

  const getPrizeTier = (value: number) => {
    if (value > 90) return "high";
    if (value > 60) return "medium";
    return "low";
  };

  const revealBox = (boxNum: number) => {
    if (boxes[boxNum].opened) return;

    const prizeData = boxes[boxNum];
    const tier = getPrizeTier(prizeData.value);

    setRevealedPrize(prizeData);

    const boxElement = document.querySelector(`[data-box-num='${boxNum}']`);
    if (boxElement) {
      gsap.to(boxElement, {
        duration: 0.5,
        scale: 1.2,
        rotation: 360,
        onComplete: () => {
          const newBoxes = { ...boxes };
          newBoxes[boxNum].opened = true;
          setBoxes(newBoxes);
          gsap.to(modalRef.current, { duration: 0.5, autoAlpha: 1 });
        },
      });
    }
    const audio = new Audio(`/assets/sounds/${tier}.mp3`);
    audio.play();
  };

  const pickRandomBox = () => {
    // Get all unopened boxes
    const unopenedBoxes = Object.keys(boxes).filter(boxNum => !boxes[parseInt(boxNum)].opened);
    
    if (unopenedBoxes.length === 0) {
      alert("All boxes have been opened!");
      return;
    }
    
    // Pick a random unopened box
    const randomIndex = Math.floor(Math.random() * unopenedBoxes.length);
    const randomBoxNum = parseInt(unopenedBoxes[randomIndex]);
    
    // Scroll to the random box
    const boxElement = document.querySelector(`[data-box-num='${randomBoxNum}']`);
    if (boxElement) {
      boxElement.scrollIntoView({ behavior: "smooth", block: "center" });
      
      // Add a brief highlight effect
      gsap.to(boxElement, {
        duration: 0.3,
        scale: 1.3,
        boxShadow: "0 0 20px #9146FF",
        repeat: 2,
        yoyo: true,
        onComplete: () => {
          // Reveal the box after the highlight effect
          revealBox(randomBoxNum);
        }
      });
    }
  };

  const closeModal = () => {
    gsap.to(modalRef.current, {
      duration: 0.5,
      autoAlpha: 0,
      onComplete: () => {
        setRevealedPrize(null);
      },
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    const boxNum = parseInt(e.target.value);
    if (boxNum > 0 && boxNum <= 1000) {
      const boxElement = document.querySelector(`[data-box-num='${boxNum}']`);
      if (boxElement) {
        boxElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  return (
    <>
      <header>
        <h1>🎁 Oogli&apos;s Mystery Box 🎁</h1>
        <p>
          Watch live on <a href="https://twitch.tv/oogli" target="_blank" rel="noreferrer">twitch.tv/oogli</a>
        </p>
        <input
          type="text"
          id="searchBox"
          placeholder="Search for a box number..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <nav>
          <a href="/register" style={{ marginLeft: '10px', color: '#007bff' }}>Register</a>
          <a href="/login" style={{ marginLeft: '10px', color: '#007bff' }}>Login</a>
        </nav>
        <button 
          onClick={pickRandomBox}
          style={{ 
            marginTop: '15px',
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'background-color 0.2s ease-in-out'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
        >
          🎲 Pick Random Box
        </button>
      </header>
      <main id="boxGrid">
        {Object.keys(boxes).map((boxNumStr) => {
          const boxNum = parseInt(boxNumStr);
          const box = boxes[boxNum];
          const shouldHighlight = !searchTerm || boxNumStr === searchTerm;
          return (
            <div
              key={boxNum}
              className={`box ${box.opened ? "opened" : ""} ${getPrizeTier(box.value)}`}
              data-box-num={boxNum}
              onClick={() => revealBox(boxNum)}
              style={{
                outline: shouldHighlight ? "2px solid #9146FF" : "none",
                boxShadow: shouldHighlight ? "0 0 10px #9146FF" : "none",
              }}
            >
              {box.opened ? "🎉" : boxNum}
            </div>
          );
        })}
      </main>
      <div id="prizeModal" ref={modalRef}>
        {revealedPrize && (
          <div className="modal-content">
            <span className="close" onClick={closeModal}>&times;</span>
            <h2>Congratulations!</h2>
            <p>You&apos;ve won:</p>
            <p className="prize-name">{revealedPrize.prize}</p>
            <p className="prize-value">Value: {revealedPrize.value}</p>
          </div>
        )}
      </div>
      <aside id="chatEmbed">
        <iframe
          src="https://www.twitch.tv/embed/oogli/chat?parent=https://twitch-prize.vercel.app/"
          frameBorder="0"
          scrolling="no"
          height="500"
          width="350"
        ></iframe>
      </aside>
    </>
  );
}