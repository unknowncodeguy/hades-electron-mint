import React, { useState, useEffect, useRef } from 'react';
import * as fs from 'fs';
import path from 'path';
import Discord from 'discord.js';
import moment from 'moment';
import { CircularBorderDiv, CustomButton, CustomInputLabel, CustomTextField } from './helper/CustomHtml';
import { Alert, Snackbar } from '@mui/material';
import { createWebhookMessage } from './helper/Discord';

const isDevelopment = process.env.NODE_ENV !== 'production'
var settingsPath = '';
if (isDevelopment) {
    settingsPath = path.resolve('./', 'settings.json');
} else {
    settingsPath = process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support/Hades/settings.json' : `${process.env.APPDATA}\\Hades\\settings.json`;
}

if (!fs.existsSync(settingsPath)) {
  fs.writeFile(settingsPath, '{}', function(err) {
    if (err) throw err;
  });
}

function SaveSettingsFile(settings: string) {
    fs.writeFile(settingsPath, settings, function(err) {
        if (err) throw err;
    });
}

export default function SettingsSection() {
    const [settings, setSettings] = React.useState({} as any);
    const [rpcUrlValue, setRpcUrlValue] = React.useState("");
    const [discordWebhookValue, setDiscordWebhookValue] = React.useState("");
    const [showAlert, setShowAlert] = React.useState(false);
    const [alertTypeValue, setAlertTypeValue] = React.useState<any>("");
    const [alertMessageValue, setAlertMessageValue] = React.useState("");

    useEffect(() => {
        let settingsRawData = fs.readFileSync(settingsPath);
	    let settingsJsonData = JSON.parse(settingsRawData.toString());
        setSettings(settingsJsonData);

        setRpcUrlValue(settingsJsonData.rpcUrl);
        setDiscordWebhookValue(settingsJsonData.discordWebhookUrl);
    }, []);

    const updateRpcUrlValue = (rpcUrl: any) => {
        settings.rpcUrl = rpcUrl;
        const updatedSettings = settings;

        saveSettings(updatedSettings);
    }

    const updateDiscordWebhookValue = (discordWebhookUrl: any) => {
        settings.discordWebhookUrl = discordWebhookUrl;
        const updatedSettings = settings;

        saveSettings(updatedSettings);
    }

    const saveSettings = (settings: any) => {
        SaveSettingsFile(JSON.stringify(settings));
        setSettings(settings);
    }

    return (
        <div style={{ width: '100%' }}>
            <div className="formControl" style={{ flex: 1, display: 'flex' }}>
                <div style={{ flex: 0.475 }}>
                    <CustomInputLabel title={undefined} style={undefined}>RPC Url</CustomInputLabel>
                    <CircularBorderDiv style={undefined}>
                        <CustomTextField
                            value={rpcUrlValue}
                            onChange={(event: { target: { value: any; }; }) => {
                                return setRpcUrlValue(event.target.value);
                            } }
                            onBlur={(event: { target: { value: any; }; }) => updateRpcUrlValue(event.target.value)}
                            style={{ fontSize: '13px' }}
                            maxLength={500} onKeyPress={undefined} startAdornment={undefined} endAdornment={undefined} disabled={undefined} />
                    </CircularBorderDiv>
                </div>
                <div style={{ flex: 0.05 }} />
                <div style={{ flex: 0.475 }}>
                    <CustomInputLabel title={undefined} style={undefined}>Discord Webhook</CustomInputLabel>
                    <CircularBorderDiv style={undefined}>
                        <CustomTextField
                            value={discordWebhookValue}
                            onChange={(event: { target: { value: any; }; }) => setDiscordWebhookValue(event.target.value)}
                            onBlur={(event: { target: { value: any; }; }) => updateDiscordWebhookValue(event.target.value)}
                            style={{ fontSize: '13px' }}
                            maxLength={500} onKeyPress={undefined} startAdornment={undefined} endAdornment={undefined} disabled={undefined} />
                    </CircularBorderDiv>
                    <CustomButton
                        onClick={async () => { 
                            const res = await createWebhookMessage('Test Webhook', [], '', '#FFFFFF', discordWebhookValue);

                            if (res) {
                                setAlertTypeValue("success");
                                setAlertMessageValue("Webhook testing");
                            } else {
                                setAlertTypeValue("error");
                                setAlertMessageValue("Error sending webhook");
                            }

                            setShowAlert(true);
                        }}
                        variant={undefined} width={undefined} height={undefined} fontSize={undefined} style={undefined}
                    >Test Webhook</CustomButton>
                </div>
            </div>
            <Snackbar open={showAlert} autoHideDuration={3000} onClose={() => setShowAlert(false)}>
                <Alert elevation={6} variant='filled' color={alertTypeValue}>
                    {alertMessageValue}
                </Alert>
            </Snackbar>
        </div>
    )
}