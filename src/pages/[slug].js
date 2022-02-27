import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { NextSeo } from 'next-seo'
import { regex } from '../utils/regex'
import { settings } from '../data/settings'
import Subheader from '../components/Subheader'
import Alert from '../components/Alert'
import md5 from 'crypto-js/md5'
import axios from 'axios'
import useTranslation from 'next-translate/useTranslation'

const SlugPage = ({ serverSide }) => {
  const { t } = useTranslation('home')

  const router = useRouter()

  const [countdown, setCountdown] = useState(settings.redirects.timer.countdown)

  useEffect(() => {
    let redirected = false

    const interval = setInterval(() => {
      if (document.hasFocus()) {
        if (countdown > 0) {
          setCountdown(--countdown)
        } else {
          if (!redirected && router) {
            redirected = true

            router.push(serverSide.data.url_long)
          }
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <NextSeo
        title={t('title-slug', {
          siteTitle: t('all:site-title'),
          slug: serverSide.slug
        })}
        canonical={`${settings.main.URL}/${serverSide.slug}`}
        openGraph={{
          url: `${settings.main.URL}/${serverSide.slug}`,
          title: t('og-title-slug', {
            siteTitle: t('all:site-title'),
            slug: serverSide.slug
          }),
          description: t('all:og-description'),
          site_name: t('all:site-title')
        }}
      />

      {!serverSide.error ? (
        <>
          <Subheader data={serverSide.data} />

          <div className="main">
            <div className="timer">
              <div className="timer-text">{countdown}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="main">
          <Alert
            title={t('error')}
            text={t(serverSide.error)}
            className="alert-danger"
          />
        </div>
      )}
    </>
  )
}

export async function getServerSideProps(context) {
  const slug = context.params.slug.replace(regex.replace.slug, '')
  let result = false

  if (slug.length > 0) {
    result = {
      props: {
        serverSide: {
          slug,
          data: false,
          error: false
        }
      }
    }

    if (!settings.slugs.banned.includes(slug.toLocaleLowerCase('en-US'))) {
      const hash = md5(
        `${settings.keys.signature}:${settings.main.parse.hostname}:${slug}`
      ).toString()

      await axios
        .get(`${settings.main.API}/urls/${hash}`)
        .then((res) => {
          if (!res.data.error) {
            if (res.data.url_redirect === 'direct') {
              result = {
                redirect: {
                  permanent: false,
                  destination: res.data.url_long
                }
              }
            } else {
              result.props.serverSide.data = res.data
            }
          } else {
            result.props.serverSide.error = `api:error.${res.data.error.key.replace(
              /_/g,
              '-'
            )}`
          }
        })
        .catch(() => {
          result.props.serverSide.error = 'unknown-error'
        })
    } else {
      result.props.serverSide.error = 'banned-slug'
    }
  } else {
    result = {
      redirect: {
        permanent: false,
        destination: '/'
      }
    }
  }

  return result
}

export default SlugPage
