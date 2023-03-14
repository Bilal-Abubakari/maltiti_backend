<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;

class ContactusController extends AbstractController
{
    #[Route('/contactus', name: 'app_contactus', methods: ['POST'])]
    public function index(Request $request, MailerInterface $mailer): JsonResponse
    {
          $data = json_decode($request->getContent(), true);
          $email = (new TemplatedEmail())
            ->from('noreply@maltitiaenterprise.com')
            ->to('abubakaribilal99@gmail.com')
            ->subject("Website Contact us")
            ->text("Hello Sir")
            ->htmlTemplate('email/contactus.html.twig')
              ->context([
                  'name' => $data['fullName'],
                  'emailAddress' => $data['email'],
                  'number' => $data['number'],
                  'message' => $data['message']
              ]);
        try {
            $mailer->send($email);
        }
        catch (TransportExceptionInterface) {

        }

        return new JsonResponse([
            'message' => "Message sent successfully"
        ]);
    }
}
