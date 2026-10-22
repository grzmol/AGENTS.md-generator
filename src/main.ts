import { mount } from 'svelte'
import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/geist-mono'
import './app.css'
import App from './App.svelte'

mount(App, { target: document.getElementById('app')! })
