import React, { useState, useEffect } from 'react';
import logo from "../../../static/hades-logo-text.png";
import '../css/normalize.css';
import '../css/utils.css';
import '../css/fonts.css';
import '../css/App.css';
import { darkModePrimary, darkModeSecondary, secondaryColor, thirdColor, twitterUrl, websiteUrl } from './helper/Constants';
import { AppBar, Divider, Grid, IconButton, Paper, Toolbar, Tooltip } from '@mui/material';
import TwitterIcon from '@mui/icons-material/Twitter';
import LanguageIcon from '@mui/icons-material/LanguageOutlined';
import RemoveIcon from '@mui/icons-material/RemoveOutlined';
import CloseIcon from '@mui/icons-material/CloseOutlined';
import CropSquareOutlinedIcon from '@mui/icons-material/CropSquareOutlined';
import TabSection from './TabSection';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Required to access electron things in this file.
const { ipcRenderer, shell } = window.require('electron');

const isDevelopment = process.env.NODE_ENV !== 'production'

const theme = createTheme({
  typography: {
    fontFamily: [
      'Play',
      'cursive',
    ].join(','),
  },});

function App() {
  const [windowWidth, setWindowWidth] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);
  const [appVersion, setAppVersion] = useState(0);
  const [selectedTabValue, setSelectedTabValue] = useState("");

  useEffect(() => {
    updateWindowDimensions();
    window.addEventListener('resize', updateWindowDimensions);

    // getUserKey((key) => {
    //   firebaseInitialize(key, keyDeactivated);
    // });

    ipcRenderer.send('app_version');
    ipcRenderer.on('app_version', (event: any, arg: any) => {
      setAppVersion(arg ? arg.version : 0);
    });

    if (!isDevelopment) {
      //await checkForUpdate();
    }

    return function cleanup() {
      window.removeEventListener('resize', updateWindowDimensions);
    }
  }, []);

  const updateWindowDimensions = () => {
    setWindowWidth(window.innerWidth);
    setWindowHeight(window.innerHeight);
  }

  return (
    <ThemeProvider theme={theme}>
      <Paper style={{ backgroundColor: darkModePrimary }}>
        <AppBar elevation={0} position="static" style={{ backgroundColor: secondaryColor }}>
        <Toolbar className="draggable" style={{ paddingLeft: '0px' }}>
          <img src={logo} style={{ width: '160px', height: '64px' }} />
            <Grid item xs />
            <Tooltip title="Minimize">
              <IconButton onClick={() => ipcRenderer.send('minimize')} color="inherit" className="notDraggable" style={{ color: darkModeSecondary, marginLeft: '10px' }}>
                <RemoveIcon style={{ width: '20px', height: '20px' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Maximize">
              <IconButton onClick={() => ipcRenderer.send('maximize')} color="inherit" className="notDraggable" style={{ color: darkModeSecondary }}>
                <CropSquareOutlinedIcon style={{ width: '20px', height: '20px' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton onClick={() => ipcRenderer.send('close')} color="inherit" className="notDraggable" style={{ color: darkModeSecondary }}>
                <CloseIcon style={{ width: '20px', height: '20px' }} />
              </IconButton>
            </Tooltip>
        </Toolbar>
        </AppBar>
        <TabSection windowHeight={windowHeight} setTabName={(value: any) => setSelectedTabValue(value)} />
      </Paper>
    </ThemeProvider>
  );
}

export default App;