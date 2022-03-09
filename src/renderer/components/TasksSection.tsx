import React, { useState, useEffect, useRef } from 'react';
import { 
    darkModePrimary,
    darkModeSecondary,
    lightModePrimary,
    lightModeSecondary,
    secondaryColor
} from './helper/Constants';
import { CircularBorderDiv, CustomButton, CustomDialog, CustomDialogTitle, CustomInputLabel, CustomTextField, CustomSelect } from './helper/CustomHtml';

import * as fs from 'fs';
import path from 'path';
import { Alert, AppBar, DialogActions, DialogContent, Divider, Grid, IconButton, MenuItem, Paper, Snackbar, Table, TableBody, TableContainer, TableHead, TableRow, Toolbar, Tooltip, Typography, Backdrop, CircularProgress} from '@mui/material';
import { withStyles, makeStyles, createStyles } from '@mui/styles';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import PlayArrowIcon from '@mui/icons-material/PlayArrowOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { MEDetails, ME_AccountInfo, MintToken, MintMEToken } from '../solana/Solana';
import { createWebhookMessage } from './helper/Discord';
import { styled } from '@mui/styles';

const isDevelopment = process.env.NODE_ENV !== 'production'

const useStyles = makeStyles(() => 
    createStyles({
        root: {},
        actionButton: {
            transition: `all .3s`,
            '&:hover': {
                transform: `scale(1.2)`
            }
        }
    })
);

var tasksPath = '';
var walletsPath = '';
var settingsPath = ''
if (isDevelopment) {
    tasksPath = path.resolve('./', 'tasks.json');
    walletsPath = path.resolve('./', 'wallets.json');
    settingsPath = path.resolve('./', 'settings.json');
} else {
    tasksPath = process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support/Hades/tasks.json' : `${process.env.APPDATA}\\Hades\\tasks.json`;
    walletsPath = process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support/Hades/wallets.json' : `${process.env.APPDATA}\\Hades\\wallets.json`;
    settingsPath = process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support/Hades/settings.json' : `${process.env.APPDATA}\\Hades\\settings.json`;
}

if (!fs.existsSync(tasksPath)) {
  fs.writeFile(tasksPath, '[]', function(err) {
    if (err) throw err;
  });
}

if (!fs.existsSync(walletsPath)) {
    fs.writeFile(walletsPath, '[]', function(err) {
      if (err) throw err;
    });
}

if (!fs.existsSync(settingsPath)) {
    fs.writeFile(settingsPath, '{}', function(err) {
      if (err) throw err;
    });
}

function SaveTasksFile(tasks: any) {
    fs.writeFile(tasksPath, tasks, function(err) {
        if (err) throw err;
    });
}

function createUniqueId(length: number) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
      backgroundColor: '#00000',
      color: '#FFFFFF',
      width: '150px',
      border: 0
    },
    [`&.${tableCellClasses.body}`]: {
      fontSize: 14,
      width: '150px',
      color: '#FFFFFF',
      border: '1px solid #1C1C1C',
    //   borderRadius: '10px'
    },
  }));
  
  const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
      
    },
    // hide last border
    '&:last-child td, &:last-child th': {
      
    },
  }));

async function mintToken(platform: any, candyMachineId: any, rpcUrl: any, isDevelopment: boolean, privateKey: any) {
    try {
        switch (platform) {
            case 'CMV2':
                const cmv2MintTokenResponse = await MintToken(candyMachineId, rpcUrl, isDevelopment, privateKey);
                return cmv2MintTokenResponse;
            case 'MEL':
                const melMintTokenResponse = await MintMEToken(candyMachineId, rpcUrl, privateKey);
                return melMintTokenResponse;
            default:
                return null;
        }
    } catch (e) {
        console.log(`TasksSection.tsx -- mintToken error: ${e}`);
        return null;
    }
}

async function startTask(wallets: any[], settings: { rpcUrl: any; discordWebhookUrl: string; }, { platform, cmid, walletId }: any) {
    const walletArray = wallets.filter((x: { id: any; }) => x.id === walletId);
    if (walletArray.length > 0) {
        const privateKeyFromWallet = walletArray[0].privateKey;

        try{
            const txn = await mintToken(platform, cmid, settings.rpcUrl, isDevelopment, privateKeyFromWallet);

            if (txn && txn.length > 0 && txn !== null && txn !== undefined) {
                await createWebhookMessage('Mint Response', [{ key: "txn", value: `https://solscan.io/tx/${txn[0]}${isDevelopment ? '?cluster=devnet' : ''}` }], "", "#FFFFFF", settings.discordWebhookUrl);
    
                return {
                    state: true,
                    msg: `Mint successed, Please check your collectibles.`
                };
            } else {
                await createWebhookMessage('Mint Failed! Please Retry again.', [], "", "#FFFFFF", settings.discordWebhookUrl);
    
                return {
                    state: false,
                    msg: `Mint Failed! Please retry again.`
                };
            }
        }
        catch(err) {
            return {
                state: false,
                msg: `Mint Failed! Please retry again.`
            };
        }
        finally{

        }

    } else {
        // Problem: Can't find wallet!
        await createWebhookMessage('Wallet not found!', [], "", "#FFFFFF", settings.discordWebhookUrl);

        return {
            state: true,
            msg: `Wallet not found!`
        };
    }
}

function AddTaskDialog({ onClose, open, wallets, addTask } : { onClose: any, open: any, wallets: any, addTask: any }) {
    const [platformValue, setPlatformValue] = React.useState("");
    const [cmidValue, setCmidValue] = React.useState("");
    const [walletValue, setWalletValue] = React.useState("");
    const [qtyValue, setQtyValue] = React.useState(1);
    const [showAlert, setShowAlert] = React.useState(false);
    const [alertTypeValue, setAlertTypeValue] = React.useState<any>("");
    const [alertMessageValue, setAlertMessageValue] = React.useState("");

    const validateAddTask = () => {
        return platformValue !== "" && cmidValue !== "" && walletValue !== "";
    }

    const clearAddTaskFields = (close: boolean) => {
        setPlatformValue('');
        setCmidValue('');
        setWalletValue('');
        if (close) {
            onClose();
        }
    }
  
    return (
        <CustomDialog
          open={open}
          onClose={() => onClose()}
          style={{ width: '800px', border: `solid 1px white`}}
        >
            <CustomDialogTitle
                onClick={() => onClose()}
            >
                Add Task
            </CustomDialogTitle>
            <DialogContent>
                <div className="formControl" style={{ flex: 1, display: 'flex' }}>
                    <div style={{ flex: 0.3 }}>
                        <CustomInputLabel title={undefined} style={undefined}>Platform*</CustomInputLabel>
                        <CircularBorderDiv style={undefined}>
                            <CustomSelect
                                value={platformValue}
                                onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => setPlatformValue(event.target.value)}
                                style={{ fontSize: '13px', height: '35px' }}
                            >
                                <MenuItem value={"CMV2"} style={{ fontSize: '13px' }}>CMV2</MenuItem>
                                <MenuItem value={"MEL"} style={{ fontSize: '13px' }}>MEL</MenuItem>
                            </CustomSelect>
                        </CircularBorderDiv>
                    </div>
                    <div style={{ flex: 0.05 }} />
                    <div style={{ flex: 0.3 }}>
                        <CustomInputLabel title={undefined} style={undefined}>CMID*</CustomInputLabel>
                        <CircularBorderDiv style={undefined}>
                            <CustomTextField
                                value={cmidValue}
                                onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => setCmidValue(event.target.value)}
                                style={{ fontSize: '13px' }} onBlur={undefined} onKeyPress={undefined} startAdornment={undefined} endAdornment={undefined} disabled={undefined}/>
                        </CircularBorderDiv>
                    </div>
                    <div style={{ flex: 0.05 }} />
                    <div style={{ flex: 0.3 }}>
                        <CustomInputLabel title={undefined} style={undefined}>Wallet*</CustomInputLabel>
                        <CircularBorderDiv style={undefined}>
                            <CustomSelect
                                value={walletValue}
                                onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => setWalletValue(event.target.value)}
                                style={{ fontSize: '13px', height: '35px' }}
                            >
                                {wallets.map((x: { id: any; walletName: any; }) =>
                                    <MenuItem key={x.id} value={x.id} style={{ fontSize: '13px' }}>{x.walletName}</MenuItem>
                                )}
                            </CustomSelect>
                        </CircularBorderDiv>
                    </div>
                </div>
                <div className="formControl" style={{ flex: 1, display: 'flex' }}>
                    <CustomInputLabel title={undefined} style={undefined}>Qty*</CustomInputLabel>
                    <CircularBorderDiv style={undefined}>
                        <CustomSelect
                            value={qtyValue}
                            onChange={(event: { target: { value: React.SetStateAction<number>; }; }) => setQtyValue(event.target.value)}
                            style={{ fontSize: '13px', height: '35px' }}
                        >
                            {[...Array.from(Array(10).keys())].filter(y => y > 0).map(x =>
                                <MenuItem key={x} value={x} style={{ fontSize: '13px' }}>{x}</MenuItem>
                            )}
                        </CustomSelect>
                    </CircularBorderDiv>
                </div>
            </DialogContent>
            <DialogActions>
                <CustomButton onClick={() => onClose()} variant={undefined} width={undefined} height={undefined} fontSize={undefined} style={undefined}>Cancel</CustomButton>
                <CustomButton
                    onClick={async () => {
                        if (validateAddTask()) {
                            addTask(platformValue, cmidValue, walletValue, qtyValue);
                            clearAddTaskFields(true);

                        } else {
                            setAlertTypeValue("error");
                            setAlertMessageValue("Empty wallet name or invalid private key!");
                            setShowAlert(true);
                        }
                    } } variant={undefined} width={undefined} height={undefined} fontSize={undefined} style={undefined}>
                    Add Task
                </CustomButton>
            </DialogActions>
            <Snackbar open={showAlert} autoHideDuration={3000} onClose={() => setShowAlert(false)}>
                <Alert elevation={6} variant='filled' color={alertTypeValue}>
                    {alertMessageValue}
                </Alert>
            </Snackbar>
        </CustomDialog>
    );
}

function EditTaskDialog({ onClose, open, wallets, rowItem, editTask } : { onClose: any, open: any, wallets: any, rowItem: any, editTask: any }) {
    const [rowId, setRowId] = React.useState("");
    const [platformValue, setPlatformValue] = React.useState("");
    const [cmidValue, setCmidValue] = React.useState("");
    const [walletValue, setWalletValue] = React.useState("");
    const [showAlert, setShowAlert] = React.useState(false);
    const [alertTypeValue, setAlertTypeValue] = React.useState<any>("");
    const [alertMessageValue, setAlertMessageValue] = React.useState("");

    useEffect(() => {
        setRowId(rowItem.id);
        setPlatformValue(rowItem.platform);
        setCmidValue(rowItem.cmid);
        setWalletValue(rowItem.walletId);
    }, [open]);

    const validateEditTask = () => {
        return platformValue !== "" && cmidValue !== "" && walletValue !== "";
    }

    const clearEditTaskFields = () => {
        setPlatformValue('');
        setCmidValue('');
        setWalletValue('');
    }
  
    return (
        <CustomDialog
          open={open}
          onClose={() => onClose()}
          style={{ width: '800px', border: `solid 1px white`}}
        >
            <CustomDialogTitle
                onClick={() => onClose()}
            >
                Edit Task
            </CustomDialogTitle>
            <DialogContent>
                <div className="formControl" style={{ flex: 1, display: 'flex' }}>
                    <div style={{ flex: 0.3 }}>
                        <CustomInputLabel title={undefined} style={undefined}>Platform*</CustomInputLabel>
                        <CircularBorderDiv style={undefined}>
                            <CustomSelect
                                value={platformValue}
                                onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => setPlatformValue(event.target.value)}
                                style={{ fontSize: '13px', height: '35px' }}
                            >
                                <MenuItem value={"CMV2"} style={{ fontSize: '13px' }}>CMV2</MenuItem>
                                <MenuItem value={"MEL"} style={{ fontSize: '13px' }}>MEL</MenuItem>
                            </CustomSelect>
                        </CircularBorderDiv>
                    </div>
                    <div style={{ flex: 0.05 }} />
                    <div style={{ flex: 0.3 }}>
                        <CustomInputLabel title={undefined} style={undefined}>CMID*</CustomInputLabel>
                        <CircularBorderDiv style={undefined}>
                            <CustomTextField
                                value={cmidValue}
                                onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => setCmidValue(event.target.value)}
                                style={{ fontSize: '13px' }} onBlur={undefined} onKeyPress={undefined} startAdornment={undefined} endAdornment={undefined} disabled={undefined}/>
                        </CircularBorderDiv>
                    </div>
                    <div style={{ flex: 0.05 }} />
                    <div style={{ flex: 0.3 }}>
                        <CustomInputLabel title={undefined} style={undefined}>Wallet*</CustomInputLabel>
                        <CircularBorderDiv style={undefined}>
                            <CustomSelect
                                value={walletValue}
                                onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => setWalletValue(event.target.value)}
                                style={{ fontSize: '13px', height: '35px' }}
                            >
                                {wallets.map((x: { id: any; walletName: any; }) =>
                                    <MenuItem key={x.id} value={x.id} style={{ fontSize: '13px' }}>{x.walletName}</MenuItem>
                                )}
                            </CustomSelect>
                        </CircularBorderDiv>
                    </div>
                </div>
            </DialogContent>
            <DialogActions>
                <CustomButton onClick={() => onClose()} variant={undefined} width={undefined} height={undefined} fontSize={undefined} style={undefined}>Cancel</CustomButton>
                <CustomButton
                    onClick={async () => {
                        if (validateEditTask()) {
                            onClose();
                            editTask(rowId, platformValue, cmidValue, walletValue);
                            clearEditTaskFields();
                        } else {
                            setAlertTypeValue("error");
                            setAlertMessageValue("Empty wallet name or invalid private key!");
                            setShowAlert(true);
                        }
                    } } variant={undefined} width={undefined} height={undefined} fontSize={undefined} style={undefined}>
                    Edit Task
                </CustomButton>
            </DialogActions>
            <Snackbar open={showAlert} autoHideDuration={3000} onClose={() => setShowAlert(false)}>
                <Alert elevation={6} variant='filled' color={alertTypeValue}>
                    {alertMessageValue}
                </Alert>
            </Snackbar>
        </CustomDialog>
    );
}

function TaskTable({ windowHeight, tasks, wallets, settings, openEditTask, duplicateTask, deleteTask }: { windowHeight: any, tasks: any, wallets: any, settings: any, openEditTask: any, duplicateTask: any, deleteTask: any }) {
    const classes = useStyles();
    const [alertTypeValue, setAlertTypeValue] = React.useState<any>("");
    const [alertMessageValue, setAlertMessageValue] = React.useState("");
    const [showAlert, setShowAlert] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    return (
        <React.Fragment>
            <TableContainer elevation={0} style={{ maxHeight: windowHeight - 270, backgroundColor: 'transparent'}} component={Paper}>
                <Table style={{ borderCollapse: 'separate', borderSpacing: '0px 5px' }}>
                {tasks.length > 0 && 
                        <TableHead sx={{ backgroundColor: darkModePrimary }}>
                            <TableRow style={{ border: 0 }}>
                                <StyledTableCell>Platform</StyledTableCell>
                                <StyledTableCell>CMID</StyledTableCell>
                                <StyledTableCell>Wallet</StyledTableCell>
                                <StyledTableCell>Status</StyledTableCell>
                                <StyledTableCell style={{width: `20%`}}>Actions</StyledTableCell>
                            </TableRow>
                        </TableHead>
                    }
                    <TableBody>
                        {tasks.map((row: { id?: any; platform: any; cmid: any; walletId: any; }) => (
                            <StyledTableRow key={row.id} sx={{ backgroundColor: secondaryColor, border: 0 }}>
                                <StyledTableCell>{row.platform}</StyledTableCell>
                                <StyledTableCell>{row.cmid}</StyledTableCell>
                                <StyledTableCell>{wallets.filter((x: { id: any; }) => x.id === row.walletId).length > 0 ? wallets.filter((x: { id: any; }) => x.id === row.walletId)[0].walletName : ''}</StyledTableCell>
                                <StyledTableCell>Idle</StyledTableCell>
                                {wallets.filter((x: { id: any; }) => x.id === row.walletId).length > 0 &&
                                    <StyledTableCell style={{width: `20%`}}>
                                        <IconButton onClick={
                                            async () => {
                                                setLoading(true);
                                                const res = await startTask(wallets, settings, row);
                                                setAlertTypeValue("error");
                                                if(res.state) {
                                                    setAlertTypeValue("success");
                                                }
                                                setAlertMessageValue(res.msg ? res.msg : `Unexpected error!`);
                                                setShowAlert(true);
                                                setLoading(false);
                                            }
                                        } 
                                            color="inherit" className={`notDraggable ${classes.actionButton}`} style={{ color: lightModePrimary, paddingLeft: 0}}>
                                            <PlayCircleOutlineIcon style={{ width: '20px', height: '20px' }} />
                                        </IconButton>
                                        <IconButton onClick={async () => openEditTask(row)} color="inherit" className={`notDraggable ${classes.actionButton}`} style={{ color: lightModePrimary }}>
                                            <EditIcon style={{ width: '20px', height: '20px' }} />
                                        </IconButton>
                                        <IconButton onClick={async () => duplicateTask(row.id)} color="inherit" className={`notDraggable ${classes.actionButton}`} style={{ color: lightModePrimary }}>
                                            <ContentCopyIcon style={{ width: '20px', height: '20px' }} />
                                        </IconButton>
                                        <IconButton onClick={() => deleteTask(row.id)} color="inherit" className={`notDraggable ${classes.actionButton}`} style={{ color: lightModePrimary }}>
                                            <DeleteIcon style={{ width: '20px', height: '20px' }} />
                                        </IconButton>
                                    </StyledTableCell>
                                }
                            </StyledTableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Backdrop
                sx={{ color: '#fff', zIndex: 9 }}
                open={loading}
            >
                <CircularProgress color="inherit" />
            </Backdrop>

            <Snackbar open={showAlert} autoHideDuration={3000} onClose={() => setShowAlert(false)}>
                <Alert severity={alertTypeValue}>
                    {alertMessageValue}
                </Alert>
            </Snackbar>
        </React.Fragment>
    )
}

export default function TasksSection({ windowHeight } : { windowHeight: any }) {
    const [tasks, setTasks] = React.useState([] as any[]);
    const [wallets, setWallets] = React.useState([]);
    const [settings, setSettings] = React.useState([]);
    const [showAlert, setShowAlert] = React.useState(false);
    const [alertTypeValue, setAlertTypeValue] = React.useState<any>("");
    const [alertMessageValue, setAlertMessageValue] = React.useState("");
    const [addTaskDialogOpen, setAddTaskDialogOpen] = React.useState(false);
    const [editTaskDialogOpen, setEditTaskDialogOpen] = React.useState(false);
    const [editRowItem, setEditRowItem] = React.useState({} as any);

    const classes = useStyles();

    useEffect(() => {
        let tasksRawData = fs.readFileSync(tasksPath);
	    let tasksJsonData = JSON.parse(tasksRawData.toString());
        setTasks(tasksJsonData);

        let walletsRawData = fs.readFileSync(walletsPath);
	    let walletsJsonData = JSON.parse(walletsRawData.toString());
        setWallets(walletsJsonData);

        let settingsRawData = fs.readFileSync(settingsPath);
	    let settingsJsonData = JSON.parse(settingsRawData.toString());
        setSettings(settingsJsonData);
    }, []);

    const addTask = (platformValue: any, cmidValue: any, walletValue: any, qtyValue: number) => {
        var updatedTasks = [];
        for (var i = 0; i < qtyValue; i++) {
            updatedTasks.push({ id: createUniqueId(30), platform: platformValue, cmid: cmidValue, walletId: walletValue });
        }
        updatedTasks = tasks.concat(updatedTasks);

        SaveTasksFile(JSON.stringify(updatedTasks));
        setTasks(updatedTasks);

        setAlertTypeValue("success");
        setAlertMessageValue("Added new task!");
        setShowAlert(true);
    }

    const openEditTask = (row: any) => {
        setEditRowItem(row);
        setEditTaskDialogOpen(true);
    }

    const editTask = (id: any, platformValue: any, cmidValue: any, walletValue: any) => {
        var rowItemIndex = tasks.findIndex((x => x.id === id));
        if (rowItemIndex > -1) {
            tasks[rowItemIndex] = {
                id,
                platform: platformValue,
                cmid: cmidValue,
                walletId: walletValue
            }
            
            SaveTasksFile(JSON.stringify(tasks));
            setTasks(tasks);

            setAlertTypeValue("success");
            setAlertMessageValue("Edited task!");
        } else {
            setAlertTypeValue("error");
            setAlertMessageValue("Error editing task!");
        }
        setShowAlert(true);
    }

    const duplicateTask = (id: any) => {
        var rowItemIndex = tasks.findIndex((x => x.id === id));
        if (rowItemIndex > -1) {
            var taskToDuplicate = { ...tasks[rowItemIndex] };
            taskToDuplicate.id = createUniqueId(30);
            console.log(`taskToDuplicate: ${JSON.stringify(taskToDuplicate)}`)
            const updatedTasks = tasks.concat([taskToDuplicate]);
            
            SaveTasksFile(JSON.stringify(updatedTasks));
            setTasks(updatedTasks);

            setAlertTypeValue("success");
            setAlertMessageValue("Duplicated task!");
        } else {
            setAlertTypeValue("error");
            setAlertMessageValue("Error duplicating task!");
        }
        setShowAlert(true);
    };

    const deleteTask = (id: any) => {
        var updatedTasks = tasks.filter(x => x.id != id);
        SaveTasksFile(JSON.stringify(updatedTasks));
        setTasks(updatedTasks);

        setAlertTypeValue("success");
        setAlertMessageValue("Deleted task!");
        setShowAlert(true);
    }

    return (
        <React.Fragment>
            <AppBar elevation={0} position="static" style={{ backgroundColor: darkModePrimary, marginBottom: '15px' }}>
                <Toolbar style={{ paddingLeft: '0px' }}>
                    <div style={{ flexDirection: 'column', display: 'flex' }}>
                        <Typography variant={'h4'}>Tasks</Typography>
                    </div>
                    <Grid item xs />
                    {/* <Tooltip title="Test">
                        <IconButton
                            onClick={async () => {
                                const medetails = await ME_AccountInfo();

                                console.log(medetails.status);

                                console.log(`metdetails: ${JSON.stringify(medetails)}`);
                            }}
                            color="inherit"
                            className="notDraggable"
                            style={{ color: darkModeSecondary }}
                        >
                            <AddCircleOutlineIcon />
                        </IconButton>
                    </Tooltip> */}
                    <Tooltip title="Add Task">
                        <IconButton onClick={() => setAddTaskDialogOpen(true)} color="inherit" className="notDraggable" style={{ color: darkModeSecondary }}>
                            <AddCircleOutlineIcon className={`${classes.actionButton}`}/>
                        </IconButton>
                    </Tooltip>
                </Toolbar>
                <Divider style={{ backgroundColor: secondaryColor, height: '2px' }} />
                <Typography component={'span'} style={{ fontSize: '13px', marginLeft: '10px' }}>{tasks.length} Total</Typography>
            </AppBar>
            <TaskTable windowHeight={windowHeight} tasks={tasks} wallets={wallets} settings={settings} openEditTask={(row: any) => openEditTask(row)} duplicateTask={(id: any) => duplicateTask(id)} deleteTask={(id: any) => deleteTask(id)} />
            <AddTaskDialog open={addTaskDialogOpen} wallets={wallets} onClose={() => { setAddTaskDialogOpen(false) }} addTask={(platformValue: any, cmidValue: any, walletValue: any, qtyValue: any) => addTask(platformValue, cmidValue, walletValue, qtyValue)} />
            <EditTaskDialog open={editTaskDialogOpen} wallets={wallets} rowItem={editRowItem} onClose={() => { setEditTaskDialogOpen(false) }} editTask={(id: any, platformValue: any, cmidValue: any, walletValue: any) => editTask(id, platformValue, cmidValue, walletValue)} />
            <Snackbar open={showAlert} autoHideDuration={3000} onClose={() => setShowAlert(false)}>
                <Alert elevation={6} variant='filled' color={alertTypeValue}>
                    {alertMessageValue}
                </Alert>
            </Snackbar>
        </React.Fragment>
    )
}