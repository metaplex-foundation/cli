// Helper to strip ANSI color codes
export const stripAnsi = (str: string): string => {
    let result = ''
    let i = 0
    while (i < str.length) {
        // Detect ESC character (char code 27 or '\x1b')
        if (str.charCodeAt(i) === 27) {
            if (str[i + 1] === '[') {
                // CSI sequence: skip ESC and '[', then skip until terminating 'm'
                i += 2
                while (i < str.length && str[i] !== 'm') {
                    i++
                }
                // Skip the terminating 'm'
                if (i < str.length && str[i] === 'm') {
                    i++
                }
            } else {
                // Other ESC sequence: skip ESC and next character
                i += 2
            }
        } else {
            // Regular character, append to result
            result += str[i]
            i++
        }
    }
    return result
}