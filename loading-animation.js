const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*()_+-=[]{}|;:,.<>?/~`!¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿▀▄█▌▐░▒▓■□▢▣▤▥▦▧▨▩▪▫▬▭▮▯▰▱▲△▴▵▶▷▸▹►▻▼▽▾▿◀◁◂◃◄◅◆◇◈◉◊○◌◍◎●◐◑◒◓◔◕◖◗◘◙◚◛◜◝◞◟◠◡◢◣◤◥◦◧◨◩◪◫◬◭◮◯◰◱◲◳◴◵◶◷◸◹◺◻◼◽◾◿';

// Starting text and final text mapping
const startText = [
    ['d', 'e', 'v'],
    ['a', 'r', 't'],
    ['o', 'p', 's']
];

const finalText = [
    ['o', 'r', 'b'],
    ['a', 't', 'r'],
    ['o', 'n', '.']
];

class MatrixEffect {
    constructor(element, finalChar, startDelay) {
        this.element = element;
        this.finalChar = finalChar;
        this.startDelay = startDelay;
    }

    async start() {
        return new Promise(resolve => {
            setTimeout(() => {
                const startTime = Date.now();
                const firstPhaseEndTime = startTime + 800;
                
                // First phase: Random characters for 0.8s
                const firstPhase = setInterval(() => {
                    const now = Date.now();
                    const timeLeft = firstPhaseEndTime - now;
                    
                    if (timeLeft <= 50) { // Last iteration
                        clearInterval(firstPhase);
                        
                        // Ensure final character is set exactly at 0.8s
                        setTimeout(() => {
                            // Set final character and make it white
                            this.element.style.transition = 'none';
                            this.element.textContent = this.finalChar;
                            this.element.style.color = 'white';
                            this.element.style.textShadow = '0 0 8px white';
                            
                            // Start color transition
                            requestAnimationFrame(() => {
                                this.element.style.transition = 'color 1s, text-shadow 1s';
                                this.element.style.color = '#42de93';
                                this.element.style.textShadow = 'none';
                                
                                // Start second phase after color transition
                                setTimeout(() => {
                                    this.element.style.transition = 'opacity 0.05s';
                                    const fadeStartTime = Date.now();
                                    
                                    // Second phase: Fade out over 0.8s
                                    const secondPhase = setInterval(() => {
                                        const fadeElapsed = Date.now() - fadeStartTime;
                                        
                                        if (fadeElapsed >= 800) {
                                            clearInterval(secondPhase);
                                            this.element.style.opacity = '0';
                                            resolve();
                                            return;
                                        }
                                        
                                        this.element.style.opacity = '0';
                                        setTimeout(() => {
                                            this.element.textContent = chars[Math.floor(Math.random() * chars.length)];
                                            this.element.style.opacity = (1 - (fadeElapsed / 800)).toString();
                                        }, 25); // Faster character swap in fade out phase
                                    }, 25);
                                }, 1000); // Wait for 1s color transition
                            });
                        }, timeLeft);
                        return;
                    }
                    
                    // Regular random character updates
                    this.element.style.opacity = '0';
                    setTimeout(() => {
                        this.element.textContent = chars[Math.floor(Math.random() * chars.length)];
                        this.element.style.opacity = '1';
                    }, 25); // Faster character swap (25ms instead of 50ms = twice as many characters during transition)
                }, 25);
            }, this.startDelay);
        });
    }
}

async function initLoadingSequence() {
    // Wait for click
    await new Promise(resolve => {
        document.getElementById('loading-overlay').addEventListener('click', resolve, { once: true });
    });

    // Create flat arrays of starting and final characters
    const startChars = startText.flat();
    const finalChars = finalText.flat();
    
    // Get all letters in sequence
    const letters = [];
    let letterIndex = 0;
    
    document.querySelectorAll('.text-row').forEach((row, rowIndex) => {
        row.querySelectorAll('span').forEach((letter, colIndex) => {
            if (letter.textContent.trim()) {
                // Verify the starting character matches our map
                if (letter.textContent !== startChars[letterIndex]) {
                    console.error(`Mismatch in starting character mapping at index ${letterIndex}. Expected ${startChars[letterIndex]}, got ${letter.textContent}`);
                }
                
                letters.push({
                    element: letter,
                    finalChar: finalChars[letterIndex]
                });
                
                letterIndex++;
            }
        });
    });

    // Calculate when to start the background fade
    // Total animation time for last letter = startDelay + firstPhase + colorTransition + secondPhase
    const lastLetterDelay = (letters.length - 1) * 300; // Start delay for last letter
    const backgroundFadeDelay = lastLetterDelay + 800; // Start fade when last letter hits its final character

    // Start background fade timer
    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.transition = 'background-color 2s ease-out';
        overlay.style.backgroundColor = 'transparent';
    }, backgroundFadeDelay);

    // Start all animations with proper delays
    const promises = letters.map((letter, index) => {
        const effect = new MatrixEffect(
            letter.element,
            letter.finalChar,
            index * 300 // 0.2s delay between each letter
        );
        return effect.start();
    });

    // Wait for all animations to complete
    await Promise.all(promises);
    
    // Remove overlay after all animations complete
    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        overlay.remove();
    }, 500);
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initLoadingSequence();
});