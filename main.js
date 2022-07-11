const path = require('path')
const os = require('os')
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const imagemin = require('imagemin')
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')
const slash = require('slash')
const log = require('electron-log')

process.env.NODE_ENV = 'production' // Environment is set to development

const isDevelopment = process.env.NODE_ENV !== 'production' ? true : false;
const isMac = process.platform === 'darwin' ? true : false;

let mainWindow;
let aboutWindow;

function createMainWindow () {
    mainWindow = new BrowserWindow ({
        width: isDevelopment ? 800 : 500,
        height: 600,
        icon: './assets/icons/Icon_256x256.png',
        resizable: isDevelopment,
        backgroundColor: 'white',

        // Typically, you want to include node integration so you can still use all of node.js's modules in your electron applications
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });

    mainWindow.loadFile('./app/index.html');
}

function createAboutWindow () {
    aboutWindow = new BrowserWindow ({
        title: 'About Image Compression',
        width: 300,
        height: 300,
        icon: './assets/icons/Icon_256x256.png',
        resizable: false,
        backgroundColor: 'white',
    });

    aboutWindow.loadFile('./app/about.html');
}

app.on('ready', () => {
    createMainWindow();

    const mainMenu = Menu.buildFromTemplate(menu)
    Menu.setApplicationMenu(mainMenu)
    mainWindow.on('closed', () => mainWindow = null)
});

// Menu template is an array of objects
const menu = [
    ...(isMac ? [{ 
        label: app.name,
        submenu: [
            {
                label: 'About',
                click: createAboutWindow,
            }
        ]
     }] : []),
    {
      role: 'fileMenu',
    },

    ...(!isMac ? [
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: createAboutWindow,
                },
            ],
        },
    ] : []),

    ...(isDevelopment
      ? [
          {
            label: 'Developer',
            submenu: [
              { role: 'reload' },
              { role: 'forcereload' },
              { type: 'separator' },
              { role: 'toggledevtools' },
            ],
          },
        ]
      : []),
  ];

ipcMain.on('image:minimize', (e, options) => {
    // Compression process
    options.dest = path.join(os.homedir(), 'imagecompress')
    shrinkImage(options)
})

async function shrinkImage({ imgPath, imageQuality, dest }) {
    try{
        const pngQuality = imageQuality / 100
        const files = await imagemin([slash(imgPath)], {
            destination: dest,
            plugins: [
                imageminMozjpeg({ imageQuality }),
                imageminPngquant({
                    quality: [pngQuality, pngQuality]
                })
            ]
        })

        log.info(files)
        shell.openPath(dest)

        // Send events from window to the IPC renderer
        mainWindow.webContents.send('image:done')
    } catch (err) {
        console.log(err)
        log.error(err)
    }
}

app.on('window-all-closed', () => {
    if(!isMac) {
        app.quit();
    }
})

app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
})

app.allowRendererProcessReuse = true;