# Installing

## Server Setup

I used AWS Lambda, but you can do whatever you want and then setup the `index.mjs` to run.

## Hardware Setup

### Supplies

The supplies listed below are not strictly necessary, but rather what I used and found success with, and have wrote the README for.

- [Raspberry Pi Zero 2 W](https://www.raspberrypi.com/products/raspberry-pi-zero-2-w/)
- [7" IPS LCD Touch Screen 1024×600](https://www.amazon.com/gp/product/B09XKC53NH)
- MicroSD Card (I am using an 8GB SanDisk card)
- Male micro-USB to male micro-USB cord
- Female mini HDMI to male HDMI cord
- Micro-USB charger (I am using a 9W adapter from a Google Home Mini and it has been working fine)

### Software Setup

Using the Raspberry Pi Imager, install Raspberry Pi OS Lite (32 Bit) on your microSD card, and setup the hostname, WiFi, and SSH from the installer.

**Note:** This guide is going to assume you can ssh into the device or plug a keyboard directly into it. To plug in a keyboard, you will need a micro-USB splitter/hub to get more ports.

Make sure your device is up to date.

```bash
sudo apt update && sudo apt upgrade
sudo apt autoremove
```

Install X Windows System (X11) since RPi OS Lite doesn't have a desktop environment. This makes the install lighter and helps the Pi stay more responsive.

```bash
sudo apt install --no-install-recommends xserver-xor
sudo apt install --no-install-recommends xinit
sudo apt install --no-install-recommends x11-xserver-utils
```

Install Chromium
**Note:** My Pi crashed at about 14% through this install and I was unable to reconnect via SSH, so I had to go power cycle it manually.

```bash
sudo apt install chromium-browser
```

Install some packages to make the UI look nicer (hide the mouse and window management elements, etc)

```bash
sudo apt install matchbox-window-manager xautomation unclutter
```

### Auto Launch Script

Need to set it up so that the Pi auto boots & logs in, and then once the mbus user (or whatever you set the user to be) is logged in and initialized chromium will launch.

Write this script to a file like so:

```bash
nano ~/kiosk
```

and paste in the following, updating the URL to open at the end as desired:

```bash
#!/bin/sh

xset -dpms      # disable DPMS (Energy Star) features
xset s off      # disable screen saver
xset s noblank  # don't blank the video device
matchbox-window-manager -use_titlebar no &
unclutter &     # hide X mouse cursor unless in use
chromium-browser --display=:0 --kiosk --noerrdialogs --disable-infobards --no-first-run --start-maximized --incognito --window-position=0,0 https://m-bus.pages.dev
```

Make this script executable now with:

```bash
chmod 755 ~/kiosk
```

Now, we will set the `.bashrc` file to run this on initialization:

**Note:** You can change this accordingly to any other default shell your device boots to, like `.zshrc`.

```bash
nano ~/.bashrc
```

Go to the end of the file, and add:

```bash
xinit /home/mbus/kiosk -- vt$(fgconsole)
```

### Display Settings

For my usage, I had the display set to be in a vertical orientation. As such, I had to change some settings to make the Pi rotate the HDMI output and remap the touch screen interface to this new orientation.

Open the boot config:

```bash
sudo nano /boot/firmware/config.txt
```

And paste this in at the end, probably under `[all]`:

```bash
display_hdmi_rotate=1
# swap the value as needed, with 0=default (no rotation), 1=90˚, 2=180˚, 3=270˚
```

In this same config file, you will also need to find `dtoverlay=vc4-kms-v3d` and comment it out.

**TODO: rotate touch mapping**

### Pi Settings

Finally, we need to make some tweaks to `raspi-config` to setup the auto-login, etc.

You need to change:

- 1. System Options -> S5. Boot / Auto Login -> B2. Console Auto Login
- 4. Performance Options -> P2. Overlay File System -> Yes / Enabled (This will take a while. When done, it will prompt for write-protected. Select Yes.)

When everything is setup how you like, run `sudo reboot` to see if it works. If you just finished making some changes via `raspi-config`, it may prompt to do the reboot for you (which is fine) so you won't need to reboot again manually.

### Making Edits

Whether you need to change the URL, the screen orientation, or something else, you'll quickly find you run into issues, as in the previous step we enabled write-protection to improve the stability of the device throughout unexpected power outages, etc.

To temporarily enable write access again (until the next reboot), run `sudo mount -o remount,rw /boot`

## References

The Pi setup and configuration process was heavily influenced by a combination of web articles/blog posts. These were (in no particular order):

- [How to use a Raspberry Pi in Kiosk Mode - Raspberry Pi](https://www.raspberrypi.com/tutorials/how-to-use-a-raspberry-pi-in-kiosk-mode/)
- [Configure a Raspberry Pi as a Kiosk Display - ReelyActive](https://reelyactive.github.io/diy/pi-kiosk/)
- [Build a Raspberry Pi Kiosk - A Step-By-Step Tutorial - Fleetstack](https://fleetstack.io/blog/raspberry-pi-kiosk-tutorial)
- [Raspberry Pi Kiosk Using Chromium - PiMyLifeUp](https://pimylifeup.com/raspberry-pi-kiosk/)