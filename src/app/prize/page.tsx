"use client";

import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";

// 🎁 Define your prize pool with counts (odds still apply)
const prizePool = [
  { prize: "Unified Minds Booster Box", count: 1, value: 120 },
  { prize: "151 UPC", count: 1, value: 100 },
  { prize: "151 ETB", count: 1, value: 50 },
  { prize: "Random Pack", count: 120, value: 5 },
  { prize: "Random Single (Low-tier)", count: 500, value: 2 },
  { prize: "Random Single (Mid-tier)", count: 20, value: 15 },
  { prize: "Random Single (High-tier)", count: 12, value: 35 },
  { prize: "Spin Punishment Wheel", count: 110, value: 0 },
  { prize: "Vintage Card Bundle", count: 20, value: 40 },
  { prize: "Magic Booster Pack", count: 20, value: 5 },
  { prize: "Next Box 50% Off", count: 40, value: 0 },
  { prize: "Womp Womp", count: 160, value: 0 },
  { prize: "Gem Depo (Boxed)", count: 50, value: 25 },
  { prize: "Random Slab", count: 25, value: 30 },
  { prize: "Random Pokémon Merch (Pick)", count: 20, value: 20 },
  { prize: "Custom Pokémon Art", count: 20, value: 15 },
];

// 🔀 Generate 1000 shuffled boxes
function generateBoxes() {
  let allPrizes: { prize: string; value: number; opened: boolean }[] = [];

  prizePool.forEach((item) => {
    for (let i = 0; i < item.count; i++) {
      allPrizes.push({ prize: item.prize, value: item.value, opened: false });
    }
  });

  // Fisher-Yates shuffle
  for (let i = allPrizes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPrizes[i], allPrizes[j]] = [allPrizes[j], allPrizes[i]];
  }

  // Map into object {1..1000}
  const boxMap: { [key: number]: { prize: string; value: number; opened: boolean } } = {};
  allPrizes.forEach((prize, idx) => {
    boxMap[idx + 1] = prize;
  });

  return boxMap;
}

// 📦 Load boxes from localStorage or generate new ones
function loadBoxesFromStorage() {
  if (typeof window === "undefined") return {};
  
  const stored = localStorage.getItem('mysteryBoxes');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing stored boxes:', error);
      return generateBoxes();
    }
  }
  return generateBoxes();
}

// 💾 Save boxes to localStorage
function saveBoxesToStorage(boxes: { [key: number]: { prize: string; value: number; opened: boolean } }) {
  if (typeof window === "undefined") return;
  localStorage.setItem('mysteryBoxes', JSON.stringify(boxes));
}

export default function Home() {
  const [boxes, setBoxes] = useState<{ [key: number]: { prize: string; value: number; opened: boolean } }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [revealedPrize, setRevealedPrize] = useState<{ prize: string; value: number } | null>(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const loadedBoxes = loadBoxesFromStorage();
    setBoxes(loadedBoxes);
  }, []);

  const revealBox = (boxNum: number) => {
    if (boxes[boxNum].opened) return; // prevent duplicate pick

    const prizeData = boxes[boxNum];
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
          saveBoxesToStorage(newBoxes); // Save to localStorage
          gsap.to(modalRef.current, { duration: 0.5, autoAlpha: 1 });
        },
      });
    }
  };

  const pickRandomBox = () => {
    const unopenedBoxes = Object.keys(boxes).filter((boxNum) => !boxes[parseInt(boxNum)].opened);
    if (unopenedBoxes.length === 0) {
      alert("All boxes have been opened!");
      return;
    }

    const randomIndex = Math.floor(Math.random() * unopenedBoxes.length);
    const randomBoxNum = parseInt(unopenedBoxes[randomIndex]);

    const boxElement = document.querySelector(`[data-box-num='${randomBoxNum}']`);
    if (boxElement) {
      boxElement.scrollIntoView({ behavior: "smooth", block: "center" });
      gsap.to(boxElement, {
        duration: 0.3,
        scale: 1.3,
        boxShadow: "0 0 20px #9146FF",
        repeat: 2,
        yoyo: true,
        onComplete: () => {
          revealBox(randomBoxNum);
        },
      });
    }
  };

  const resetBoxes = () => {
    if (confirm("Are you sure you want to reset all boxes? This will clear all opened prizes.")) {
      const newBoxes = generateBoxes();
      setBoxes(newBoxes);
      saveBoxesToStorage(newBoxes);
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

  // Count opened boxes for display
  const openedCount = Object.values(boxes).filter(box => box.opened).length;
  const totalBoxes = Object.keys(boxes).length;

  return (
    <>
      <header>
        <h1>🎁 Oogli&apos;s Mystery Box 🎁</h1>
        <p>
          Watch live on{" "}
          <a href="https://twitch.tv/oogli" target="_blank" rel="noreferrer">
            twitch.tv/oogli
          </a>
        </p>
        <div style={{ marginBottom: "10px" }}>
          <span style={{ color: "#666", fontSize: "14px" }}>
            Opened: {openedCount}/{totalBoxes} boxes
          </span>
        </div>
        <input
          type="text"
          id="searchBox"
          placeholder="Search for a box number..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <nav>
          <a href="/register" style={{ marginLeft: "10px", color: "#007bff" }}>
            Register
          </a>
          <a href="/login" style={{ marginLeft: "10px", color: "#007bff" }}>
            Login
          </a>
        </nav>
        <div style={{ marginTop: "15px", display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            onClick={pickRandomBox}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "background-color 0.2s ease-in-out",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#0056b3")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#007bff")}
          >
            🎲 Pick Random Box
          </button>
          <button
            onClick={resetBoxes}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "background-color 0.2s ease-in-out",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#c82333")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#dc3545")}
          >
            🔄 Reset All Boxes
          </button>
        </div>
      </header>

      <main id="boxGrid">
        {Object.keys(boxes).map((boxNumStr) => {
          const boxNum = parseInt(boxNumStr);
          const box = boxes[boxNum];
          const shouldHighlight = !searchTerm || boxNumStr === searchTerm;
          return (
            <div
              key={boxNum}
              className={`box ${box.opened ? "opened" : ""}`}
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

      {/* 🎉 Modal now only shows prize name */}
      <div id="prizeModal" ref={modalRef}>
        {revealedPrize && (
          <div className="modal-content">
            <span className="close" onClick={closeModal}>
              &times;
            </span>
            <h2>Congratulations!</h2>
            <p>You&apos;ve won:</p>
            <p className="prize-name">{revealedPrize.prize}</p>
          </div>
        )}
      </div>

      <aside id="chatEmbed">
        <iframe
          src="https://www.twitch.tv/embed/oogli/chat?parent=twitch-prize.vercel.app"
          frameBorder="0"
          scrolling="no"
          height="500"
          width="350"
        ></iframe>
      </aside>
    </>
  );
}
