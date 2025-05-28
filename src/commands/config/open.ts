import {Command} from '@oclif/core'
import {getDefaultConfigPath} from '../../lib/Context.js'
import {dirname} from 'path'
import {exec} from 'child_process'
import {promisify} from 'util'

const execAsync = promisify(exec)

export default class ConfigOpenCommand extends Command {
  static override description = 'Open the config directory in the default file explorer'

  public async run(): Promise<void> {
    const configPath = getDefaultConfigPath()
    const configDir = dirname(configPath)

    try {
      // Check if running in WSL
      const isWSL = process.platform === 'linux' && process.env.WSL_DISTRO_NAME !== undefined
      
      let command: string
      if (isWSL) {
        const { stdout } = await execAsync(`wslpath -w "${configDir}"`);
        const windowsPath = stdout.trim();
        command = `explorer.exe "${windowsPath}"`;
      } else {
        // Use platform-specific commands for non-WSL environments
        command = process.platform === 'win32' 
          ? `explorer "${configDir}"`
          : process.platform === 'darwin'
          ? `open "${configDir}"`
          : `xdg-open "${configDir}"`
      }

      try {
        await execAsync(command)
        this.log(`\nOpened config directory: ${configDir}`)
      } catch (error) {
        // Only show manual options if automatic opening fails
        this.warn('\nFailed to open directory automatically. Try these options:')
        this.log('1. Run this command:')
        this.log(command)
        if (isWSL) {
          this.log('\n2. Or paste this path in Windows Explorer\'s address bar:')
          this.log(`\\\\wsl$\\${process.env.WSL_DISTRO_NAME}${configDir}`)
        }
      }
    } catch (error) {
      this.error(`Failed to get Windows path: ${error}`)
    }
  }
} 