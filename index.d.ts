export interface SelfTlsOptions {
	keyFile: string
	certFile: string
	domain: string
	altNames: string[]
}
export function selftls(options: SelfTlsOptions): Promise<void>


export interface CertPeriodResult {
	isValid: boolean
	daysRemaining: number
	daysDuration: number
	notBefore: string
	notAfter: string
}
export function certperiod(domain: string): Promise<CertPeriodResult>


export interface SkipDnsOptions {
	url: string
	ip: string
	port?: number
	family?: 4 | 6
	method?: 'HEAD' | 'GET'
	timeout?: number
}
export function skipdns(options: SkipDnsOptions): Promise<number>


export interface TimingPhase {
	time: number
	cumulative: number
}
export interface TimeResult {
	http_version: string
	dns_lookup: TimingPhase
	tcp_handshake: TimingPhase
	tls_handshake: TimingPhase
	wait: TimingPhase
	first_byte: TimingPhase
	download: TimingPhase
}
export function time(url: string, httpVersion: 1 | 2 | 3): Promise<TimeResult>


export interface SshKeygenOptions {
	outPath: string
	rounds: number
	passphrase?: string
}
export function sshkeygen(options: SshKeygenOptions): Promise<void>

export function macloop(label: string, addr: string): string
