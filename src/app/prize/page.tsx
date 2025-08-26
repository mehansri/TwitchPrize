"use client";

import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { isUserAuthorized } from "@/lib/config";
import Link from "next/link";

// 🎁 Define your prize pool with counts (odds still apply)
const prizePool = [
  { prize: "Unified Minds Booster Box", count: 1, value: 120, glow: "gold" },
  { prize: "151 UPC", count: 1, value: 100, glow: "gold" },
  { prize: "151 ETB", count: 1, value: 50, glow: "gold" },
  { prize: "Random Pack", count: 120, value: 5, glow: "blue" },
  { prize: "Random Single (Low-tier)", count: 420, value: 2, glow: "green" },
  { prize: "Random Single (Mid-tier)", count: 20, value: 15, glow: "blue" },
  { prize: "Random Single (High-tier)", count: 12, value: 35, glow: "purple" },
  { prize: "Spin Punishment Wheel", count: 60, value: 0, glow: "green" },
  { prize: "Vintage Card Bundle", count: 20, value: 40, glow: "blue" },
  { prize: "Magic Booster Pack", count: 20, value: 5, glow: "blue" },
  { prize: "Next Box 50% Off", count: 40, value: 0, glow: "blue" },
  { prize: "Womp Womp", count: 170, value: 0, glow: "green" },
  { prize: "Gem Depo (Boxed)", count: 50, value: 25, glow: "green" },
  { prize: "Random Slab", count: 25, value: 30, glow: "purple" },
  { prize: "Random Pokémon Merch (Pick)", count: 20, value: 20, glow: "purple" },
  { prize: "Custom Pokémon Art", count: 20, value: 15, glow: "purple" },
];

// 🔀 Generate 1000 shuffled boxes
function generateBoxes() {
  const allPrizes: { prize: string; value: number; opened: boolean; glow: string }[] = [];

  prizePool.forEach((item) => {
    for (let i = 0; i < item.count; i++) {
      allPrizes.push({ 
        prize: item.prize, 
        value: item.value, 
        opened: false, 
        glow: item.glow 
      });
    }
  });

  // Fisher-Yates shuffle
  for (let i = allPrizes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPrizes[i], allPrizes[j]] = [allPrizes[j], allPrizes[i]];
  }

  // Map into object {1..1000}
  const boxMap: { [key: number]: { prize: string; value: number; opened: boolean; glow: string } } = {};
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
function saveBoxesToStorage(boxes: { [key: number]: { prize: string; value: number; opened: boolean; glow: string } }) {
  if (typeof window === "undefined") return;
  localStorage.setItem('mysteryBoxes', JSON.stringify(boxes));
}

// 🌟 Get glow color for a prize
function getGlowColor(glow: string): string {
  switch (glow) {
    case "gold":
      return "#FFD700";
    case "blue":
      return "#007bff";
    case "green":
      return "#28a745";
    case "purple":
      return "#6f42c1";
    default:
      return "#9146FF";
  }
}



export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [boxes, setBoxes] = useState<{ [key: number]: { prize: string; value: number; opened: boolean; glow: string } }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [revealedPrize, setRevealedPrize] = useState<{ prize: string; value: number; glow: string } | null>(null);
  const [showManualOpener, setShowManualOpener] = useState(false);
  const [manualUserEmail, setManualUserEmail] = useState("");
  const [userSelectionMode, setUserSelectionMode] = useState<'pending' | 'manual'>('pending');
  interface PendingUser {
    id: string;
    name: string;
    email: string;
    paymentAmount: number;
    paymentId: string;
    createdAt: string;
  }
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const modalRef = useRef(null);

  const fetchPendingUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/pending-users');
      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data.pendingUsers || []);
      } else {
        console.error('Failed to fetch pending users');
      }
    } catch (error) {
      console.error('Error fetching pending users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (showManualOpener) {
      fetchPendingUsers();
    }
  }, [showManualOpener]);

  // 🔐 Check authentication and authorization
  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (status === "unauthenticated") {
      // Not logged in, redirect to login
      signIn();
      return;
    }

    if (status === "authenticated" && session?.user) {
      // Check if user is authorized
      const isAuthorized = isUserAuthorized(session.user.email, session.user.id);
      
      if (!isAuthorized) {
        // Not authorized, redirect to home page
        alert("Access denied. You are not authorized to view this page.");
        router.push("/");
        return;
      }
    }
  }, [session, status, router]);

  useEffect(() => {
    // Only load boxes if user is authorized
    if (status === "authenticated" && session?.user) {
      const isAuthorized = isUserAuthorized(session.user.email, session.user.id);
      
      if (isAuthorized) {
        const loadedBoxes = loadBoxesFromStorage();
        setBoxes(loadedBoxes);
      }
    }
  }, [session, status]);

  // 🔓 Check if a box should be available based on unlock thresholds
  const isBoxAvailable = (box: { prize: string; value: number; opened: boolean; glow: string }) => {
    const openedCount = Object.values(boxes).filter(b => b.opened).length;
    
    // Gold boxes (premium prizes) unlock after 800+ boxes opened
    if (box.glow === "gold" && openedCount < 800) {
      return false;
    }
    
    // Purple boxes (high-tier prizes) unlock after 600+ boxes opened
    if (box.glow === "purple" && openedCount < 600) {
      return false;
    }
    
    return true;
  };

  // 🔀 Reshuffle boxes when tiers unlock to prevent number memorization
  const reshuffleBoxesOnUnlock = () => {
    const openedCount = Object.values(boxes).filter(b => b.opened).length;
    
    // Check if we just crossed unlock thresholds
    const justUnlockedPurple = openedCount === 600;
    const justUnlockedGold = openedCount === 800;
    
    if (justUnlockedPurple || justUnlockedGold) {
      // Add a visual effect to show reshuffling is happening
      const boxGrid = document.getElementById('boxGrid');
      if (boxGrid) {
        gsap.to(boxGrid, {
          duration: 0.3,
          opacity: 0.5,
          scale: 0.98,
          onComplete: () => {
            // Get all unopened boxes
            const unopenedBoxes = Object.entries(boxes)
              .filter(([_, box]) => !box.opened)
              .map(([num, box]) => ({ num: parseInt(num), box }));
            
            // Shuffle the unopened boxes
            for (let i = unopenedBoxes.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [unopenedBoxes[i], unopenedBoxes[j]] = [unopenedBoxes[j], unopenedBoxes[i]];
            }
            
            // Create new box mapping with shuffled positions
            const newBoxes = { ...boxes };
            unopenedBoxes.forEach(({ num, box }, index) => {
              const newNum = Object.keys(boxes).filter(key => !boxes[parseInt(key)].opened)[index];
              if (newNum) {
                newBoxes[parseInt(newNum)] = box;
              }
            });
            
            setBoxes(newBoxes);
            saveBoxesToStorage(newBoxes);
            
            // Restore visual effect
            gsap.to(boxGrid, {
              duration: 0.3,
              opacity: 1,
              scale: 1,
              onComplete: () => {
                // Show unlock notification
                const tierName = justUnlockedPurple ? "Purple" : "Gold";
                alert(`🎉 ${tierName} tier unlocked! Boxes have been reshuffled for fairness!`);
              }
            });
          }
        });
      }
    }
  };

  const handleManualPrizeOpening = async (boxNum: number) => {
    const finalUserEmail = userSelectionMode === 'manual' ? manualUserEmail : pendingUsers.find(u => u.paymentId === selectedUser)?.email;
    const finalPaymentId = userSelectionMode === 'pending' ? selectedUser : undefined;

    if (!finalUserEmail && !finalPaymentId) {
      alert("Please select a user or enter an email.");
      return;
    }

    const prize = boxes[boxNum];
    if (!prize) {
      alert("Invalid box number.");
      return;
    }

    const requestBody: {
      prizeName: string;
      boxNumber: number;
      userEmail?: string;
      paymentId?: string;
    } = {
      prizeName: prize.prize,
      boxNumber: boxNum,
    };

    if (userSelectionMode === 'manual') {
      requestBody.userEmail = finalUserEmail;
    } else if (userSelectionMode === 'pending') {
      requestBody.paymentId = finalPaymentId;
    }

    try {
      const response = await fetch('/api/admin/manual-open-prize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {


        alert(`Prize "${prize.prize}" opened for ${finalUserEmail || 'selected user'}!`);
        const newBoxes = { ...boxes };
        newBoxes[boxNum].opened = true;
        setBoxes(newBoxes);
        saveBoxesToStorage(newBoxes);
        handleManualPrizeOpened(prize.prize, finalUserEmail || 'selected user');
        // After successful opening, refresh pending users list
        fetchPendingUsers();
        setSelectedUser(""); // Clear selected user
        setManualUserEmail(""); // Clear manual email
      } else {
        alert(data.error || 'Failed to open prize.');
      }
    } catch (error) {
      console.error("Error opening prize:", error);
      alert(`An error occurred while opening the prize: ${error instanceof Error ? error.message : String(error)}`);
    }
    
  };

  const revealBox = (boxNum: number) => {
    if (showManualOpener && (selectedUser || manualUserEmail)) {
      handleManualPrizeOpening(boxNum);
      return;
    }

    if (boxes[boxNum].opened) return; // prevent duplicate pick

    const box = boxes[boxNum];
    
    // Check if box is available for opening
    if (!isBoxAvailable(box)) {
      const openedCount = Object.values(boxes).filter(b => b.opened).length;
      const requiredCount = box.glow === "gold" ? 800 : 600;
      
      // Instead of revealing the box content, show a generic message
      // This prevents users from learning which boxes contain premium prizes
      alert(`This box is temporarily unavailable. Continue opening boxes to unlock new tiers!`);
      return;
    }

    const prizeData = box;
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
          
          // Check if we need to reshuffle after this box opening
          setTimeout(() => {
            reshuffleBoxesOnUnlock();
          }, 1000); // Small delay to let the modal show first
          
          gsap.to(modalRef.current, { duration: 0.5, autoAlpha: 1 });
        },
      });
    }
  };

  const pickRandomBox = () => {
    if (showManualOpener && (selectedUser || manualUserEmail)) {
      const availableUnopenedBoxes = Object.keys(boxes).filter((boxNum) => {
        const box = boxes[parseInt(boxNum)];
        return !box.opened && isBoxAvailable(box);
      });
      if (availableUnopenedBoxes.length === 0) {
        alert("No available boxes to open.");
        return;
      }
      const randomIndex = Math.floor(Math.random() * availableUnopenedBoxes.length);
      const randomBoxNum = parseInt(availableUnopenedBoxes[randomIndex]);
      handleManualPrizeOpening(randomBoxNum);
      return;
    }

    const openedCount = Object.values(boxes).filter(b => b.opened).length;
    
    // Filter boxes that are both unopened AND available based on unlock thresholds
    const availableUnopenedBoxes = Object.keys(boxes).filter((boxNum) => {
      const box = boxes[parseInt(boxNum)];
      return !box.opened && isBoxAvailable(box);
    });
    
    if (availableUnopenedBoxes.length === 0) {
      // Check if there are any unopened boxes that are just locked
      const lockedUnopenedBoxes = Object.keys(boxes).filter((boxNum) => {
        const box = boxes[parseInt(boxNum)];
        return !box.opened && !isBoxAvailable(box);
      });
      
      if (lockedUnopenedBoxes.length > 0) {
        const nextUnlock = openedCount < 600 ? 600 : 800;
        alert(`All available boxes have been opened! You need to open ${nextUnlock - openedCount} more boxes to unlock the next tier.`);
      } else {
        alert("All boxes have been opened!");
      }
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableUnopenedBoxes.length);
    const randomBoxNum = parseInt(availableUnopenedBoxes[randomIndex]);

    const boxElement = document.querySelector(`[data-box-num='${randomBoxNum}']`);
    if (boxElement) {
      const glowColor = getGlowColor(boxes[randomBoxNum].glow);
      boxElement.scrollIntoView({ behavior: "smooth", block: "center" });
      gsap.to(boxElement, {
        duration: 0.3,
        scale: 1.3,
        boxShadow: `0 0 20px ${glowColor}`,
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
      if (showManualOpener && (selectedUser || manualUserEmail)) {
        handleManualPrizeOpening(boxNum);
      } else {
        const boxElement = document.querySelector(`[data-box-num='${boxNum}']`);
        if (boxElement) {
          boxElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  };

  const handleManualPrizeOpened = (prize: string, userEmail: string) => {
    // Show a success message for manual prize opening
    alert(`🎉 Prize "${prize}" has been opened for ${userEmail} and tracked in the system!`);
  };

  // Count opened boxes for display
  const openedCount = Object.values(boxes).filter(box => box.opened).length;
  const totalBoxes = Object.keys(boxes).length;

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        fontSize: "18px"
      }}>
        Loading...
      </div>
    );
  }

  // Show unauthorized message if not authenticated or not authorized
  if (status === "unauthenticated" || 
      (status === "authenticated" && session?.user && 
       !isUserAuthorized(session.user.email, session.user.id))) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        flexDirection: "column",
        gap: "20px"
      }}>
        <h1>🔒 Access Restricted</h1>
        <p>You are not authorized to view this page.</p>
        <button 
          onClick={() => router.push("/")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <>
      <header>
        <h1>🎁 Oogli&apos;s Mystery Box 🎁</h1>
        <p>
          Watch live on{" "}
          <Link href="https://twitch.tv/oogli" target="_blank" rel="noreferrer">
            twitch.tv/oogli
          </Link>
        </p>
        <div style={{ marginBottom: "10px" }}>
          <span style={{ color: "#666", fontSize: "14px" }}>
            Opened: {openedCount}/{totalBoxes} boxes
          </span>
          {openedCount < 600 && (
            <div style={{ marginTop: "5px", fontSize: "12px", color: "#6f42c1" }}>
              🔒 Purple tier unlocks in {600 - openedCount} more boxes
            </div>
          )}
          {openedCount >= 600 && openedCount < 800 && (
            <div style={{ marginTop: "5px", fontSize: "12px", color: "#FFD700" }}>
              🔒 Gold tier unlocks in {800 - openedCount} more boxes
            </div>
          )}
          {openedCount >= 800 && (
            <div style={{ marginTop: "5px", fontSize: "12px", color: "#28a745" }}>
              ✨ All tiers unlocked!
            </div>
          )}
        </div>
        <input
          type="text"
          id="searchBox"
          placeholder="Search for a box number..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <nav>
          <Link href="/register" style={{ marginLeft: "10px", color: "#007bff" }}>
            Register
          </Link>
          <Link href="/" style={{ marginLeft: "10px", color: "#007bff" }}>
            Login
          </Link>
        </nav>
        <div style={{ marginTop: "15px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
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
          <button
            onClick={() => setShowManualOpener(!showManualOpener)}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              backgroundColor: "#6f42c1",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "background-color 0.2s ease-in-out",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#5a32a3")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#6f42c1")}
          >
            {showManualOpener ? "🔒 Hide Manual Opener" : "🎁 Manual Prize Opener"}
          </button>
        </div>

        {/* Manual Prize Opener Section */}
        {showManualOpener && (
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "1px solid rgba(255, 255, 255, 0.2)"
          }}>
            <h3 style={{ color: "#fff", marginBottom: "15px", fontSize: "18px" }}>
              🎁 Manual Prize Opening (Admin Only)
            </h3>
            {/* User Selection */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "#fff", display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                👤 Select User Method:
              </label>
              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <label style={{ display: "flex", alignItems: "center", color: "#fff", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="userSelectionMode"
                    value="pending"
                    checked={userSelectionMode === 'pending'}
                    onChange={(e) => setUserSelectionMode(e.target.value as 'pending')}
                    style={{ marginRight: "5px" }}
                  />
                  Select from pending
                </label>
                <label style={{ display: "flex", alignItems: "center", color: "#fff", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="userSelectionMode"
                    value="manual"
                    checked={userSelectionMode === 'manual'}
                    onChange={(e) => setUserSelectionMode(e.target.value as 'manual')}
                    style={{ marginRight: "5px" }}
                  />
                  Enter manually
                </label>
              </div>

              {userSelectionMode === 'pending' ? (
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "5px",
                    border: "1px solid #ccc",
                    width: "100%",
                    backgroundColor: "#000"
                  }}
                >
                  <option value="">Select a user...</option>
                  {loadingUsers ? (
                    <option value="" disabled>Loading pending users...</option>
                  ) : pendingUsers.length > 0 ? (
                    pendingUsers.map((user) => (
                      <option key={user.paymentId} value={user.paymentId}>
                        {user.name || user.email} - ${(user.paymentAmount / 100).toFixed(2)} paid
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No pending users found</option>
                  )}
                </select>
              ) : (
                <input
                  type="email"
                  placeholder="Enter user email..."
                  value={manualUserEmail}
                  onChange={(e) => setManualUserEmail(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "5px",
                    border: "1px solid #ccc",
                    width: "100%",
                    backgroundColor: "#000"
                  }}
                />
              )}

              {userSelectionMode === 'pending' && pendingUsers.length > 0 && (
                <div style={{ marginTop: "5px", fontSize: "12px", color: "#ccc" }}>
                  Found {pendingUsers.length} user(s) with pending payments
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main id="boxGrid">
        {Object.keys(boxes).map((boxNumStr) => {
          const boxNum = parseInt(boxNumStr);
          const box = boxes[boxNum];
          const shouldHighlight = !searchTerm || boxNumStr === searchTerm;
          const glowColor = getGlowColor(box.glow);
          const isAvailable = isBoxAvailable(box);
          const isLocked = !box.opened && !isAvailable;
          
          return (
            <div
              key={boxNum}
              className={`box ${box.opened ? "opened" : ""}`}
              data-box-num={boxNum}
              onClick={() => revealBox(boxNum)}
              style={{
                outline: shouldHighlight ? `2px solid #9146FF` : "none",
                boxShadow: shouldHighlight 
                  ? `0 0 10px #9146FF` 
                  : box.opened 
                    ? `0 0 15px ${glowColor}` 
                    : "none",
                border: box.opened 
                  ? `2px solid ${glowColor}` 
                  : "1px solid #ccc",
                cursor: "pointer",
                position: "relative",
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
            <p 
              className="prize-name" 
              style={{
                color: getGlowColor(revealedPrize.glow),
                textShadow: `0 0 10px ${getGlowColor(revealedPrize.glow)}`,
                fontWeight: "bold",
                fontSize: "1.2em"
              }}
            >
              {revealedPrize.prize}
            </p>
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
